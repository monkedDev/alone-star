'use strict';

/* ============================================================
   Game — state machine (menu / playing / paused / dead),
   fixed-order update & render pipeline, HUD, scoring.
   Modules: Input, CanvasRenderer, Player, BulletPool,
            DoodleEnemyFactory, SpawnManager, Menu.
   ============================================================ */

/* parry mechanic (SPACE): 0.2s of protection, 10s cooldown */
const PARRY_ACTIVE = 0.2;
const PARRY_COOLDOWN = 10;
const PARRY_RADIUS = 38;

/* release cutscene (survive 90s -> R): star flies home, inflates,
   agonizes, partially collapses spitting pulsar rays, then fully
   collapses — inverting the whole sheet.

   Timeline (10s total):
     0-1s   fly to the centre
     1-4s   inflate to x2 — the face twists in pain
     4-7s   PARTIAL collapse: wide white eyes, rays burst out, "i feel power"
     7-10s  FULL collapse into the core -> pulsar + inverted cosmos */
const RELEASE_AT = 90;          // seconds of survival needed
const CS_FLY = 1.0;             // 0-1s
const CS_INFLATE = 3.0;         // 1-4s  (inflate x2 + pained face)
const CS_COLLAPSE = 3.0;        // 4-7s  (partial collapse + white-eye rays)
const CS_FINAL = 3.0;           // 7-10s (full collapse)

/* BROKEN MEMORIES — the second ritual (survive 150s -> R again).
    The pulsar drifts to the centre (0-2s), its face turns irritated
    and it coughs up four copies that hover at its corners and
    strike it (3-6s). Then the magnetic field wakes (6-7s) and
    EXPANDS (7-10s): the copies are shoved away and burned, the
    face relaxes — and the pulsar becomes a MAGNETAR with colossal
    magnetic fields. Phase 3 begins: super-Saturn J1407b spins its
    rings behind the sheet and the ink is 1.5x weaker (lore field).

    Timeline (10s total):
      0-2s   fly to the centre
      2-3s   irritated charge — the face turns angry
      3-6s   four copies strike the pulsar from its corners
      6-7s   copies hover — the field wakes
      7-10s  field expands, copies burn -> MAGNETAR */
const MAGNETAR_AT = 150;        // second ritual: BROKEN MEMORIES
const CS2_FLY = 2.0;            // 0-2s
const CS2_CHARGE = 1.0;         // 2-3s
const CS2_COPIES = 3.0;         // 3-6s
const CS2_HOLD = 1.0;           // 6-7s
const CS2_FIELD = 3.0;          // 7-10s

class Game {
  constructor(canvas) {
    this.renderer = new CanvasRenderer(canvas);
    this.input = new Input(canvas, this.renderer);
    this.w = this.renderer.w;
    this.h = this.renderer.h;

    this.bullets = new BulletPool();
    this.player = new Player(this);

    this.factory = new DoodleEnemyFactory(this);
    registerAllAttacks(this.factory);
    this.spawner = new SpawnManager(this, this.factory);

    this.menu = new Menu(this);

    this.state = 'menu';       // menu | playing | dead
    this.paused = false;
    this.time = 0;
    this.score = 0;
    this.deathT = 0;
    this.hi = parseInt(localStorage.getItem('doodlehell.hi') || '0', 10) || 0;
    this.menu.hi = this.hi;

    // noclip (invulnerable star) — selectable in the menu, persists
    this.noclip = localStorage.getItem('doodlehell.noclip') === '1';

    this.label = { text: '', t: 0 };

    // parry (SPACE)
    this.parryT = 0;   // protection remaining
    this.parryCd = 0;  // cooldown remaining

    // release (R after RELEASE_AT seconds): star -> pulsar -> inverted cosmos
    this.released = false;
    this.releaseNotified = false;
    // BROKEN MEMORIES (R after MAGNETAR_AT seconds): pulsar -> magnetar
    this.magnetar = false;
    this.magnetarNotified = false;
    this.magnetarT = 0;    // seconds inside phase 3 — the x RESETS on transition
    this.cs = null;        // cutscene state while state === 'cutscene'
    this.csFace = null;    // cutscene face: null | 'pain' | 'wide' | 'angry' | 'calm'
    this.cosmic = null;    // CosmicBackground spawned once released

    this._last = 0;
    this.loop = this.loop.bind(this);
  }

  /** ramp is 1.4x steeper than before. On BROKEN MEMORIES the x
      resets to 1.0 and grows from zero again — and the lore magnetar
      field holds the ink back, so phase 3 stays 1.5x gentler than
      the same second of the first phase. */
  get difficulty() {
    if (this.magnetar) return 1 + ((this.magnetarT / 40) * 1.4) / 1.5;
    return 1 + (this.time / 40) * 1.4;
  }

  /** R turns from "retry" into a ritual: "release" at 90s,
      "BROKEN MEMORIES" at 150s (after the first ritual). */
  get releaseReady() {
    if (this.state !== 'playing' || this.cs || this.magnetar) return false;
    return this.time >= (this.released ? MAGNETAR_AT : RELEASE_AT);
  }

  resize() {
    this.renderer.resize();
    this.w = this.renderer.w;
    this.h = this.renderer.h;
    if (this.state === 'playing') {
      this.player.x = clamp(this.player.x, 14, this.w - 14);
      this.player.y = clamp(this.player.y, 14, this.h - 14);
    }
  }

  /* ---------------- flow ---------------- */

  /** start (or SKIP-start) a run. `seconds` = start the game at the
      N-th second of the nightmare: spawner, difficulty and attack
      unlocks are primed to that moment, and at >= 90 the release
      ritual is available instantly (at >= 150 both rituals chain). */
  start(seconds = 0) {
    const skip = clamp(Math.floor(seconds) | 0, 0, MAGNETAR_AT);
    this.player.reset(this.w, this.h);
    this.player.mode = 'star';
    this.bullets.clear();
    this.spawner.reset();
    this.spawner.elapsed = skip;       // unlock every attack up to `skip`
    this.time = skip;
    this.score = 0;
    this.deathT = 0;
    this.parryT = 0;
    this.parryCd = 0;
    this.released = false;
    this.releaseNotified = false;
    this.magnetar = false;
    this.magnetarNotified = false;
    this.magnetarT = 0;
    this.cs = null;
    this.csFace = null;
    this.cosmic = null;
    this.renderer.inverted = false;
    this.paused = false;
    this.label.text = '';
    this.label.t = 0;
    if (skip > 0) {
      // dropped mid-nightmare: one full breath before the ink arrives
      this.player.invuln = 1.4;
      this.spawner.cooldown = 2.0;
    }
    this.state = 'playing';
    document.body.classList.add('hide-cursor');
  }

  toMenu() {
    this.state = 'menu';
    this.paused = false;
    this.bullets.clear();
    this.spawner.reset();
    this.menu.hi = this.hi;
    document.body.classList.remove('hide-cursor');
  }

  notify(text) {
    this.label.text = text;
    this.label.t = 1.8;
  }

  toggleNoclip() {
    this.noclip = !this.noclip;
    try { localStorage.setItem('doodlehell.noclip', this.noclip ? '1' : '0'); } catch (_) {}
    this.notify(this.noclip ? 'NOCLIP: ON' : 'NOCLIP: OFF');
  }

  /** SPACE — 0.2s of protection, 10s cooldown */
  tryParry() {
    if (this.parryCd > 0 || !this.player.alive || this.state !== 'playing') return false;
    this.parryT = PARRY_ACTIVE;
    this.parryCd = PARRY_COOLDOWN;
    const p = this.player;
    this.renderer.addShake(4);
    this.renderer.addFlash(0.1);
    // expanding doodle rings
    this.bullets.spawnParticle({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.3, size: 24, g: 90, ring: true, drag: 0 });
    this.bullets.spawnParticle({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.42, size: 38, g: 150, ring: true, drag: 0 });
    this.bullets.burst(p.x, p.y, 14, { s0: 120, s1: 340, life: 0.4, size: 3, g: rint(90, 170), drag: 4 });
    return true;
  }

  onPlayerHit() {
    this.renderer.addShake(13);
    this.renderer.addFlash(0.28);
    this.bullets.burst(this.player.x, this.player.y, 26, { s0: 90, s1: 420, life: 0.8, size: 5, g: rint(40, 150) });
  }

  onPlayerDeath() {
    const p = this.player;
    this.renderer.addShake(26);
    this.renderer.addFlash(0.45);
    this.bullets.burst(p.x, p.y, 90, { s0: 120, s1: 640, life: 1.4, size: 7, g: rint(20, 140), drag: 2 });
    // the whole swarm of ink dissolves into smoke
    const bl = this.bullets.bullets.used;
    for (let i = 0; i < bl.length; i++) {
      const b = bl[i];
      if (!b.alive) continue;
      if (i % 3 === 0) {
        this.bullets.spawnParticle({
          x: b.x, y: b.y, vx: rnd(-40, 40), vy: rnd(-40, 40),
          life: 0.6, size: rnd(2, 5), g: rint(140, 210), drag: 3
        });
      }
      b.alive = false;
    }
    this.deathT = 0;
  }

  gameOver() {
    this.state = 'dead';
    this.score = Math.floor(this.time * 100);
    if (this.score > this.hi) {
      this.hi = this.score;
      try { localStorage.setItem('doodlehell.hi', String(this.hi)); } catch (_) {}
    }
    document.body.classList.remove('hide-cursor');
  }

  /* ---------------- release: R after 90s ---------------- */

  startRelease() {
    if (!this.releaseReady) return;
    if (this.released) { this.startMagnetarRitual(); return; }
    const p = this.player;
    this.cs = {
      stage: 0, t: 0,
      ox: p.x, oy: p.y,        // star's start position
      scale: 1
    };
    this.csFace = null;        // face begins serene; the pain comes soon
    this.spawner.reset();      // the ink stands still for the ritual
    this.bullets.clear();      // (only particles reign during the cutscene)
    this.state = 'cutscene';
    p.invuln = 0;
    p.blinkT = 99;
    this.renderer.addFlash(0.2);
    this.renderer.addShake(6);
  }

  cutsceneUpdate(dt) {
    const cs = this.cs;
    if (!cs) { this.state = 'playing'; return; }
    const p = this.player;
    const w = this.w, h = this.h;
    cs.t += dt;
    if (this.cosmic) this.cosmic.update(dt);   // the space never sleeps

    if (this.input.tapped('KeyR')) {
      if (cs.ritual === 2) this.finishMagnetar();
      else this.finishRelease();
      return;
    }

    if (cs.ritual === 2) { this.cutsceneMagnetar(dt); return; }

    if (cs.stage === 0) { // ---- (0-1s) fly to the centre ----
      this.csFace = null;
      const k = easeInOutCubic(clamp(cs.t / CS_FLY, 0, 1));
      p.x = lerp(cs.ox, w / 2, k);
      p.y = lerp(cs.oy, h / 2, k);
      // doodle trail
      if (CLOCK.frame % 2 === 0) {
        this.bullets.spawnParticle({
          x: p.x + rnd(-6, 6), y: p.y + rnd(-6, 6),
          vx: rnd(-30, 30), vy: rnd(-30, 30),
          life: 0.6, size: rnd(2, 5), g: rint(140, 200), drag: 3
        });
      }
      if (cs.t >= CS_FLY) { cs.stage = 1; cs.t = 0; this.renderer.addShake(4); }
    } else if (cs.stage === 1) { // ---- (1-4s) inflate to x2 — everything hurts ----
      this.csFace = 'pain';
      const k = easeInOutCubic(clamp(cs.t / CS_INFLATE, 0, 1));
      cs.scale = 1 + k;                                 // 1 -> 2
      if (CLOCK.frame % 3 === 0) {
        this.bullets.spawnParticle({
          x: w / 2 + rnd(-cs.scale * 10, cs.scale * 10), y: h / 2 + rnd(-cs.scale * 10, cs.scale * 10),
          vx: rnd(-60, 60), vy: rnd(-60, 60),
          life: 0.5, size: rnd(2, 5), g: rint(120, 190), drag: 3
        });
      }
      this.renderer.addShake(2 + cs.t * 1.7);
      if (cs.t >= CS_INFLATE) { cs.stage = 2; cs.t = 0; cs.scale = 2; this.csFace = 'wide'; }
    } else if (cs.stage === 2) { // ---- (4-7s) PARTIAL collapse: white eyes + rays + "i feel power" ----
      this.csFace = 'wide';
      const k = clamp(cs.t / CS_COLLAPSE, 0, 1);
      // contracts from 2 down to ~1.35, then pulses — collapsing, but not yet
      cs.scale = 1.35 + (1 - k) * 0.65 + Math.sin(cs.t * 7) * 0.18;
      // raw energy spits out as the star fights the collapse
      if (CLOCK.frame % 4 === 0) {
        this.bullets.spawnParticle({
          x: w / 2 + rnd(-cs.scale * 12, cs.scale * 12), y: h / 2 + rnd(-cs.scale * 12, cs.scale * 12),
          vx: rnd(-120, 120), vy: rnd(-120, 120),
          life: 0.4, size: rnd(1.5, 4), g: rint(70, 160), drag: 4
        });
      }
      this.renderer.addShake(5 + Math.abs(Math.sin(cs.t * 7)) * 7);
      if (cs.t >= CS_COLLAPSE) { cs.stage = 3; cs.t = 0; cs.scale = 1.3; }
    } else { // ---- (7-10s) FULL collapse into the core ----
      this.csFace = 'wide';
      const k = easeInCubic(clamp(cs.t / CS_FINAL, 0, 1));
      cs.scale = lerp(1.3, 0.24, k);
      // everything gets sucked into the centre
      if (CLOCK.frame % 3 === 0) {
        const a = Math.random() * TAU;
        const d = 30 + (1 - k) * 70;
        this.bullets.spawnParticle({
          x: w / 2 + Math.cos(a) * d, y: h / 2 + Math.sin(a) * d,
          vx: -Math.cos(a) * (140 + k * 220), vy: -Math.sin(a) * (140 + k * 220),
          life: 0.5, size: rnd(1.5, 4), g: rint(60, 150), drag: 4
        });
      }
      this.renderer.addShake(6 + k * 22);
      if (cs.t >= CS_FINAL) {
        this.renderer.addShake(26);
        this.renderer.addFlash(0.8);
        this.bullets.burst(w / 2, h / 2, 46, { s0: 60, s1: 640, life: 1, size: 6, g: rint(20, 140), drag: 2.4 });
        this.finishRelease();
        return;
      }
    }
  }

  finishRelease() {
    const p = this.player;
    p.x = this.w / 2;
    p.y = this.h / 2;
    this.cs = null;
    this.csFace = null;
    this.released = true;
    this.renderer.inverted = true;                 // whole sheet flips
    this.cosmic = new CosmicBackground(this);      // meteors, comets, tiny stars
    p.mode = 'pulsar';
    p.invuln = 2.5;
    this.paused = false;
    this.spawner.reset();
    this.bullets.clear();
    this.state = 'playing';
    this.notify('RELEASED — INVERTED COSMOS');
    this.renderer.addShake(12);
    this.renderer.addFlash(0.35);
  }

  /* ---------------- BROKEN MEMORIES: R after 150s ---------------- */

  /** second ritual: the pulsar meets its four copies and becomes
      a magnetar. Pure theatre — spawner and bullets stand down. */
  startMagnetarRitual() {
    if (!this.releaseReady) return;
    const p = this.player;
    this.cs = {
      ritual: 2, stage: 0, t: 0,
      ox: p.x, oy: p.y,        // where the pulsar drifts from
      scale: 1,
      copyPh: [-1, -1, -1, -1] // previous strike phase per copy (impact edges)
    };
    this.csFace = null;
    this.spawner.reset();
    this.bullets.clear();
    this.state = 'cutscene';
    p.invuln = 0;
    p.blinkT = 99;
    this.renderer.addFlash(0.2);
    this.renderer.addShake(6);
  }

  /** geometry of the four copies: they hover at the pulsar's
      diagonal corners (D0), lunge inward on a staggered 1.2s
      strike cycle, and get shoved out + burned in stage 4. */
  magnetarCopyPos(cs, i, cx, cy) {
    const a = -Math.PI / 4 + i * (Math.PI / 2);
    const D0 = 96;
    let dist = D0, s = 1, alpha = 1, ph = -1;

    if (cs.stage === 2) {
      ph = ((cs.t + i * 0.3) % 1.2) / 1.2;
      let q;
      if (ph < 0.35) q = easeInCubic(ph / 0.35);        // lunge inward
      else if (ph < 0.5) q = 1;                          // impact held
      else q = 1 - easeInOutCubic((ph - 0.5) / 0.5);     // recoil back
      dist = lerp(D0, D0 * 0.42, q);
    } else if (cs.stage === 3) {
      dist = D0 - 6 + wob(i * 37 + CLOCK.tick9 * 11, 3); // tensed, jittering
    } else if (cs.stage === 4) {
      const k = clamp(cs.t / CS2_FIELD, 0, 1);
      const kk = clamp((k - 0.05) / 0.55, 0, 1);          // burned away by k=0.6
      dist = D0 + easeInCubic(kk) * 540;                  // shoved away
      s = 1 - kk;
      alpha = 1 - kk;
    }

    const bob = Math.sin(CLOCK.time * 3 + i * 1.7) * 7;
    const px = cx + Math.cos(a) * dist + Math.cos(a + Math.PI / 2) * bob * 0.5;
    const py = cy + Math.sin(a) * dist + Math.sin(a + Math.PI / 2) * bob * 0.5;
    return { x: px, y: py, s, a: alpha, ang: a, ph };
  }

  cutsceneMagnetar(dt) {
    const cs = this.cs;
    const p = this.player;
    const w = this.w, h = this.h;

    if (cs.stage === 0) { // ---- (0-2s) the pulsar drifts to the centre ----
      this.csFace = null;
      const k = easeInOutCubic(clamp(cs.t / CS2_FLY, 0, 1));
      p.x = lerp(cs.ox, w / 2, k);
      p.y = lerp(cs.oy, h / 2, k);
      if (CLOCK.frame % 2 === 0) {
        this.bullets.spawnParticle({
          x: p.x + rnd(-6, 6), y: p.y + rnd(-6, 6),
          vx: rnd(-30, 30), vy: rnd(-30, 30),
          life: 0.6, size: rnd(2, 5), g: rint(140, 200), drag: 3
        });
      }
      if (cs.t >= CS2_FLY) { cs.stage = 1; cs.t = 0; this.renderer.addShake(4); }
      return;
    }

    if (cs.stage === 1) { // ---- (2-3s) irritated charge: the face turns angry ----
      this.csFace = 'angry';
      // the charge is sucked INTO the pulsar
      if (CLOCK.frame % 3 === 0) {
        const a = Math.random() * TAU;
        const d = rnd(52, 92);
        this.bullets.spawnParticle({
          x: w / 2 + Math.cos(a) * d, y: h / 2 + Math.sin(a) * d,
          vx: -Math.cos(a) * 160, vy: -Math.sin(a) * 160,
          life: 0.35, size: rnd(1.5, 3.6), g: 0, drag: 0
        });
      }
      this.renderer.addShake(2 + cs.t * 2);
      if (cs.t >= CS2_CHARGE) {
        cs.stage = 2; cs.t = 0;
        this.renderer.addShake(8);
        this.renderer.addFlash(0.18);
        this.bullets.burst(w / 2, h / 2, 20, { s0: 40, s1: 320, life: 0.5, size: 4, g: rint(60, 150), drag: 4 });
      }
      return;
    }

    if (cs.stage === 2) { // ---- (3-6s) four copies strike the pulsar ----
      this.csFace = 'angry';
      this.renderer.addShake(3);
      for (let i = 0; i < 4; i++) {
        const st = this.magnetarCopyPos(cs, i, w / 2, h / 2);
        const prev = cs.copyPh[i];
        cs.copyPh[i] = st.ph;
        if (st.ph >= 0.35 && prev >= 0 && prev < 0.35) {
          // IMPACT — ink chips fly off the pulsar
          this.bullets.burst(st.x, st.y, 8, { s0: 80, s1: 300, life: 0.5, size: 4, g: rint(80, 170), drag: 3 });
          this.renderer.addShake(4);
          this.renderer.addFlash(0.08);
        }
      }
      if (cs.t >= CS2_COPIES) { cs.stage = 3; cs.t = 0; cs.copyPh = [-1, -1, -1, -1]; }
      return;
    }

    if (cs.stage === 3) { // ---- (6-7s) copies hover, the field wakes ----
      this.csFace = 'angry';
      this.renderer.addShake(2);
      if (CLOCK.frame % 4 === 0) {
        const a = Math.random() * TAU, d = rnd(26, 46);
        this.bullets.spawnParticle({
          x: w / 2 + Math.cos(a) * d, y: h / 2 + Math.sin(a) * d,
          vx: 0, vy: 0, life: 0.25, size: rnd(2, 4), g: 0, drag: 0
        });
      }
      if (cs.t >= CS2_HOLD) {
        cs.stage = 4; cs.t = 0;
        this.renderer.addFlash(0.15);
        this.renderer.addShake(6);
        this.cosmic = new J1407Background(this); // the sheet drifts by super-Saturn
      }
      return;
    }

    /* ---- (7-10s) the field EXPANDS: copies pushed away & burned ---- */
    const k = clamp(cs.t / CS2_FIELD, 0, 1);
    const kk = clamp((k - 0.05) / 0.55, 0, 1);
    this.csFace = k >= 0.35 ? 'calm' : 'angry';   // it worked — the face relaxes

    if (kk > 0 && kk < 1 && CLOCK.frame % 2 === 0) {
      for (let i = 0; i < 4; i++) {
        const st = this.magnetarCopyPos(cs, i, w / 2, h / 2);
        if (st.a <= 0.05) continue;
        // ash torn off the burning copies, thrown outward
        this.bullets.spawnParticle({
          x: st.x + rnd(-8, 8), y: st.y + rnd(-8, 8),
          vx: Math.cos(st.ang) * rnd(50, 170) + rnd(-30, 30),
          vy: Math.sin(st.ang) * rnd(50, 170) + rnd(-30, 30),
          life: 0.7, size: rnd(1.5, 4), g: rint(60, 140), drag: 3
        });
      }
    }
    this.renderer.addShake(5 + k * 12);
    if (cs.t >= CS2_FIELD) {
      this.renderer.addShake(24);
      this.renderer.addFlash(0.8);
      this.bullets.burst(w / 2, h / 2, 50, { s0: 60, s1: 660, life: 1, size: 6, g: rint(20, 140), drag: 2.4 });
      this.finishMagnetar();
    }
  }

  finishMagnetar() {
    const p = this.player;
    p.x = this.w / 2;
    p.y = this.h / 2;
    this.cs = null;
    this.csFace = null;
    this.magnetar = true;
    this.magnetarT = 0;                          // the difficulty x restarts from 1.0
    this.renderer.inverted = true;
    this.cosmic = new J1407Background(this);   // J1407b spins its colossal rings
    p.mode = 'pulsar';
    p.invuln = 2.5;
    this.paused = false;
    this.spawner.reset();                      // phase 3 restarts gentle (very easy)
    this.bullets.clear();
    this.state = 'playing';
    this.notify('BROKEN MEMORIES — MAGNETAR');
    this.renderer.addShake(14);
    this.renderer.addFlash(0.55);
  }

  /* ---------------- update ---------------- */

  update(dt) {
    this.renderer.update(dt);

    if (this.state === 'menu') {
      this.menu.update(dt);
      this.bullets.update(dt, this);
      if (this.input.tapped('KeyN')) this.toggleNoclip();
      if (this.label.t > 0) this.label.t -= dt;
      return;
    }

    // global keys
    if (this.input.tapped('Escape')) { this.toMenu(); return; }
    if (this.input.tapped('KeyN')) this.toggleNoclip();

    if (this.state === 'cutscene') {
      this.cutsceneUpdate(dt);
      this.bullets.update(dt, this);   // trails, ash and sparks must breathe
      if (this.label.t > 0) this.label.t -= dt;
      return;
    }

    if (this.state === 'playing') {
      if (this.input.tapped('KeyP')) this.paused = !this.paused;

      if (!this.paused) {
        this.time += dt;
        if (this.magnetar) this.magnetarT += dt;   // x-clock of the 3rd phase

        // release becomes available at RELEASE_AT — shout it once
        if (!this.released && !this.releaseNotified && this.time >= RELEASE_AT) {
          this.releaseNotified = true;
          this.notify('RELEASE READY — PRESS R');
        }
        // BROKEN MEMORIES becomes available at MAGNETAR_AT — shout it once
        if (this.released && !this.magnetar && !this.magnetarNotified && this.time >= MAGNETAR_AT) {
          this.magnetarNotified = true;
          this.notify('BROKEN MEMORIES — PRESS R');
        }

        // parry timers + activation
        if (this.input.tapped('Space')) this.tryParry();
        if (this.parryT > 0) this.parryT = Math.max(0, this.parryT - dt);
        if (this.parryCd > 0) this.parryCd = Math.max(0, this.parryCd - dt);

        this.player.update(dt, this.input);
        this.spawner.update(dt);
        if (this.cosmic) this.cosmic.update(dt);
        this.bullets.update(dt, this);

        const p = this.player;
        const parrying = this.parryT > 0;
        if (p.alive && !this.noclip) {
          const bl = this.bullets.bullets.used;
          for (let i = 0; i < bl.length; i++) {
            const b = bl[i];
            if (!b.alive) continue;
            const d = dist(b.x, b.y, p.x, p.y);
            if (parrying) {
              // parry erases incoming ink inside the ring
              if (d < PARRY_RADIUS + b.r) {
                b.alive = false;
                this.bullets.spawnParticle({
                  x: b.x, y: b.y, vx: rnd(-60, 60), vy: rnd(-60, 60),
                  life: 0.3, size: rnd(2, 4), g: rint(90, 170), drag: 5
                });
              }
            } else if (d < b.r + p.r) {
              b.alive = false;
              p.hit();
              if (!p.alive) break;
            }
          }
          if (p.alive && !parrying && this.spawner.hitTest(p.x, p.y)) p.hit();
        } else if (p.alive) {
          this.deathT = 0;
        } else {
          this.deathT += dt;
          if (this.deathT > 1.1) this.gameOver();
        }
      }

      if (this.input.tapped('KeyR')) {
        if (this.releaseReady) this.startRelease();
        else this.start(this.menu.startSec);
      }
      if (this.label.t > 0) this.label.t -= dt;
      return;
    }

    if (this.state === 'dead') {
      this.bullets.update(dt, this);
      this.deathT += dt;
      if (this.deathT > 0.6) {
        const p = this.input.pointer;
        if (this.input.tapped('KeyR') || this.input.tapped('Enter') || this.input.tapped('Space') || p.justDown) {
          this.start(this.menu.startSec);
        }
      }
      if (this.label.t > 0) this.label.t -= dt;
    }
  }

  /* ---------------- draw ---------------- */

  draw() {
    const ctx = this.renderer.ctx;
    this.renderer.begin();

    if (this.state === 'menu') {
      this.menu.draw(ctx);
    } else {
      // released cosmos sits behind everything
      if (this.cosmic) this.cosmic.draw(ctx);

      if (this.state === 'cutscene') {
        this.drawCutscene(ctx);
        this.bullets.drawParticles(ctx);
        this.player.draw(ctx, this.cs ? this.cs.scale : 1);
        this.drawCutsceneHUD(ctx);
      } else {
        this.spawner.draw(ctx);
        this.bullets.drawBullets(ctx);
        this.bullets.drawParticles(ctx);
        this.player.draw(ctx);
        this.drawHUD(ctx);

        if (this.paused) this.drawPause(ctx);
        if (this.state === 'dead') this.drawDeath(ctx);
      }
    }

    this.renderer.end();
  }

  /* ---------- release cutscene ---------- */

  drawCutscene(ctx) {
    if (this.cs && this.cs.ritual === 2) { this.drawMagnetarCutscene(ctx); return; }
    const w = this.w, h = this.h;
    const cx = w / 2, cy = h / 2;
    ctx.lineCap = 'round';
    const s = this.cs ? this.cs.stage : 0;

    // centre beacon
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    const pulse = 26 + Math.sin(CLOCK.time * 6) * 4;
    roughCircle(ctx, cx, cy, pulse, 141, 0.1, 22);
    ctx.setLineDash([]);

    if (s === 0) {
      // travel line + arrowheads from the star to the beacon
      const p = this.player;
      const a = angTo(p.x, p.y, cx, cy);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 12]);
      const d = Math.hypot(cx - p.x, cy - p.y);
      roughLine(ctx, p.x, p.y, cx, cy, 149, 3);
      ctx.setLineDash([]);
      // chevrons flying toward centre
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const k = (i + 0.5) / 4;
        const qx = lerp(p.x, cx, k), qy = lerp(p.y, cy, k);
        const off = 290 + (CLOCK.tick9 * 37) % 40;
        const tt = (((CLOCK.time * 260 - off) / 100) % 1 + 1) % 1;
        if (tt < 0.14 || tt > 0.86) continue;
        roughLine(ctx, qx - 12, qy - 9, qx, qy, 153 + i, 2);
        roughLine(ctx, qx - 12, qy + 9, qx, qy, 157 + i, 2);
      }
    } else if (s === 1) {
      // inflate: rippling rings
      for (let i = 0; i < 3; i++) {
        const rr = 34 + (CLOCK.time * 90 + i * 40) % 120;
        ctx.strokeStyle = `rgba(0,0,0,${(0.2 + i * 0.1).toFixed(2)})`;
        ctx.lineWidth = 3 - i * 0.6;
        roughCircle(ctx, cx, cy, rr, 161 + i * 7, 0.12, 20);
      }
    } else if (s === 2) {
      // partial collapse: energy aura spits out, rings tighten around the star
      const sc = this.cs ? this.cs.scale : 1.5;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(CLOCK.time * 2.2);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5;
        const r1 = sc * 10 + 8, r2 = sc * 10 + 18 + Math.sin(CLOCK.time * 11 + i * 2) * 5;
        roughLine(ctx, Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r2, Math.sin(a) * r2, 181 + i * 5, 2.4);
      }
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const rr = sc * 12 + (CLOCK.time * 60 + i * 33) % 90;
        ctx.strokeStyle = `rgba(0,0,0,${(0.2 + i * 0.08).toFixed(2)})`;
        ctx.lineWidth = 2.6 - i * 0.5;
        roughCircle(ctx, cx, cy, rr, 171 + i * 7, 0.16, 20);
      }
    } else {
      // full collapse: beams spiral faster and faster into the shrinking core
      const kt = this.cs ? this.cs.t : 0;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(CLOCK.time * 4);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5;
        const r1 = 12, r2 = 34 + Math.abs(Math.sin(CLOCK.time * 13 + i * 2)) * Math.max(14, 120 - kt * 30);
        roughLine(ctx, Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r2, Math.sin(a) * r2, 181 + i * 5, 4);
      }
      ctx.restore();
      for (let i = 0; i < 4; i++) {
        const rr = Math.max(4, (150 - kt * 40 - i * 12) % 130);
        ctx.strokeStyle = `rgba(0,0,0,${(0.32 - i * 0.06).toFixed(2)})`;
        ctx.lineWidth = 2.8 - i * 0.5;
        roughCircle(ctx, cx, cy, rr, 171 + i * 7, 0.18, 18);
      }
    }

    // "i feel power" — the star whispers it the whole time it fights the collapse
    if (s >= 2) {
      const sc = this.cs ? this.cs.scale : 1.5;
      const yT = cy - (30 + sc * 24);
      let aT = 0.9;
      if (s === 3) aT *= 1 - clamp(this.cs.t / CS_FINAL, 0, 1);
      ctx.save();
      ctx.globalAlpha = Math.max(0.1, aT);
      doodleText(ctx, 'i feel power', cx + wob(511 + CLOCK.tick9 * 13, 2.4), yT + wob(527, 2), 203, 30,
        { color: 'rgba(0,0,0,0.9)', double: true });
      ctx.restore();
    }
  }

  /** BROKEN MEMORIES: the pulsar, its four copies and the
      expanding magnetic field — all marker ink on the sheet. */
  drawMagnetarCutscene(ctx) {
    const cs = this.cs;
    const w = this.w, h = this.h;
    const cx = w / 2, cy = h / 2;
    const s = cs.stage;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // centre beacon
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    const pulse = 26 + Math.sin(CLOCK.time * 6) * 4;
    roughCircle(ctx, cx, cy, pulse, 151, 0.1, 22);
    ctx.setLineDash([]);

    if (s === 0) {
      // travel line + chevrons toward the centre (same ritual language)
      const p = this.player;
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 12]);
      roughLine(ctx, p.x, p.y, cx, cy, 149, 3);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const k = (i + 0.5) / 4;
        const qx = lerp(p.x, cx, k), qy = lerp(p.y, cy, k);
        const tt = (((CLOCK.time * 260 - i * 90) / 100) % 1 + 1) % 1;
        if (tt < 0.14 || tt > 0.86) continue;
        roughLine(ctx, qx - 12, qy - 9, qx, qy, 241 + i, 2);
        roughLine(ctx, qx - 12, qy + 9, qx, qy, 245 + i, 2);
      }
    }

    if (s === 1) {
      // irritated charge: dashed rings tighten + ticks poke inward
      for (let i = 0; i < 3; i++) {
        const rr = 46 + ((CLOCK.time * 70 + i * 33) % 90);
        ctx.strokeStyle = `rgba(0,0,0,${(0.22 + i * 0.07).toFixed(2)})`;
        ctx.lineWidth = 2.6 - i * 0.5;
        ctx.setLineDash([7, 9]);
        roughCircle(ctx, cx, cy, rr, 251 + i * 7, 0.13, 20);
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6 + CLOCK.time * 0.7;
        roughLine(ctx, cx + Math.cos(a) * 94, cy + Math.sin(a) * 94,
          cx + Math.cos(a) * 76, cy + Math.sin(a) * 76, 261 + i * 3, 2);
      }
    }

    // ---- the four copies: born at 3s, strike, hover, then burn ----
    if (s >= 2) {
      for (let i = 0; i < 4; i++) {
        const st = this.magnetarCopyPos(cs, i, cx, cy);
        let sc = st.s;
        if (s === 2 && cs.t < 0.25) sc *= cs.t / 0.25;   // pop-in birth
        if (sc <= 0.03 || st.a <= 0.03) continue;

        // birth ring
        if (s === 2 && cs.t < 0.4) {
          ctx.strokeStyle = `rgba(0,0,0,${((1 - cs.t / 0.4) * 0.6).toFixed(2)})`;
          ctx.lineWidth = 2.4;
          roughCircle(ctx, st.x, st.y, 14 + cs.t * 120, 271 + i * 5, 0.15, 14);
        }

        // motion lines trailing behind a lunging copy
        if (st.ph >= 0.12 && st.ph < 0.35) {
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 2;
          for (let j = 0; j < 2; j++) {
            const off = (j - 0.5) * 9;
            const bx = st.x + Math.cos(st.ang + Math.PI / 2) * off;
            const by = st.y + Math.sin(st.ang + Math.PI / 2) * off;
            roughLine(ctx, bx + Math.cos(st.ang) * 6, by + Math.sin(st.ang) * 6,
              bx + Math.cos(st.ang) * 24, by + Math.sin(st.ang) * 24, 277 + i * 3 + j, 2);
          }
        }

        this.drawMemoryCopy(ctx, st.x, st.y, sc, st.a, 331 + i * 17);

        // impact burst at the peak of the lunge
        if (st.ph >= 0.35 && st.ph < 0.55) {
          const ib = 1 - (st.ph - 0.35) / 0.2;
          ctx.strokeStyle = `rgba(0,0,0,${(0.7 * ib).toFixed(2)})`;
          ctx.lineWidth = 2.6;
          for (let j = 0; j < 7; j++) {
            const aa = st.ang + (j - 3) * 0.34;
            roughLine(ctx, st.x + Math.cos(aa) * 7, st.y + Math.sin(aa) * 7,
              st.x + Math.cos(aa) * (13 + 11 * ib), st.y + Math.sin(aa) * (13 + 11 * ib), 283 + j, 2);
          }
        }
      }
    }

    if (s === 3) {
      // the field wakes: dashed arcs close in, the copies tense up
      ctx.setLineDash([10, 14]);
      ctx.lineDashOffset = -CLOCK.time * 40;
      for (let i = 0; i < 2; i++) {
        ctx.strokeStyle = `rgba(0,0,0,${(0.4 - i * 0.15).toFixed(2)})`;
        ctx.lineWidth = 2.6 - i;
        roughCircle(ctx, cx, cy, 40 + i * 26 + Math.sin(CLOCK.time * 5 + i) * 4, 281 + i * 9, 0.14, 24);
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }

    if (s === 4) {
      // the magnetic field EXPANDS: three rings rush outward
      const k = clamp(cs.t / CS2_FIELD, 0, 1);
      const maxR = Math.hypot(w, h) * 0.62;
      for (let i = 0; i < 3; i++) {
        const kk = clamp(k - i * 0.14, 0, 1);
        if (kk <= 0) continue;
        const rr = lerp(30, maxR, 1 - Math.pow(1 - kk, 3));
        ctx.strokeStyle = `rgba(0,0,0,${((0.55 - i * 0.16) * (1 - kk * 0.6)).toFixed(2)})`;
        ctx.lineWidth = 4 - i;
        ctx.setLineDash(i === 1 ? [14, 10] : []);
        roughCircle(ctx, cx, cy, rr, 291 + i * 11, 0.1, 26);
      }
      ctx.setLineDash([]);

      // the colossal magnetosphere: plain concentric rings, each one
      // sliding in its own direction (grows from k=0.35)
      const fa = clamp((k - 0.35) / 0.65, 0, 1);
      if (fa > 0) fieldRings(ctx, cx, cy, 14, fa * 0.8, 511);
    }
  }

  /** one of the pulsar's four copies — a small black doodle orb
      with glaring white eyes and a scowl (flips with the sheet) */
  drawMemoryCopy(ctx, x, y, scale, alpha, seed) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(x, y);
    const R = 11 * scale;
    // corona ticks
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    for (let j = 0; j < 4; j++) {
      const a = j * Math.PI / 2 + CLOCK.time * 2.4 + seed;
      roughLine(ctx, Math.cos(a) * (R + 3), Math.sin(a) * (R + 3),
        Math.cos(a) * (R + 9), Math.sin(a) * (R + 9), seed + j, 2.4);
    }
    // core
    roughCirclePath(ctx, 0, 0, R, seed, 0.15, 10);
    ctx.fillStyle = '#000';
    ctx.fill();
    // glaring eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-R * 0.34, -R * 0.14, R * 0.2, 0, TAU);
    ctx.arc(R * 0.34, -R * 0.14, R * 0.2, 0, TAU);
    ctx.fill();
    // scowl
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = R * 0.16;
    ctx.beginPath();
    ctx.moveTo(-R * 0.3, R * 0.4);
    ctx.quadraticCurveTo(0, R * 0.14, R * 0.3, R * 0.4);
    ctx.stroke();
    ctx.restore();
  }

  drawCutsceneHUD(ctx) {
    const w = this.w;
    const s = this.cs ? this.cs.stage : 0;
    const t = this.cs ? this.cs.t : 0;

    // BROKEN MEMORIES titles
    if (this.cs && this.cs.ritual === 2) {
      let title = 'BROKEN MEMORIES';
      if (s === 1) title = 'IT REMEMBERS';
      else if (s === 2) title = '4 COPIES — ATTACK';
      else if (s === 3) title = 'THE FIELD WAKES';
      else if (s === 4) title = 'MAGNETAR ' + Math.min(99, Math.round(clamp(t / CS2_FIELD, 0, 1) * 100)) + '%';
      doodleText(ctx, title, w / 2, 64, 13, 30, { color: 'rgba(0,0,0,0.85)' });
      doodleText(ctx, 'R — skip', w - 18, this.h - 20, 97, 16, { align: 'right', color: 'rgba(0,0,0,0.45)', double: false });
      return;
    }

    let title = 'RELEASE';
    if (s === 0) title = 'THE STAR GOES HOME';
    else if (s === 1) title = 'IT HURTS — x' + (1 + t / CS_INFLATE).toFixed(1);
    else title = '';   // 'i feel power' is shouted by the overlay instead
    if (title) doodleText(ctx, title, w / 2, 64, 13, 30, { color: 'rgba(0,0,0,0.85)' });
    doodleText(ctx, 'R — skip', w - 18, this.h - 20, 97, 16, { align: 'right', color: 'rgba(0,0,0,0.45)', double: false });
  }

  drawHUD(ctx) {
    // lives
    doodleText(ctx, 'INK LEFT', 18, 22, 3, 16, { align: 'left', color: 'rgba(0,0,0,0.55)', double: false });
    for (let i = 0; i < 3; i++) {
      Player.icon(ctx, 30 + i * 30, 52, 1.1, i < this.player.lives);
    }

    // parry gauge
    const ready = this.parryCd <= 0;
    const bx = 18, by = 74, bw = 168, bh = 14;
    doodleText(ctx, 'SPACE — PARRY', bx, by - 10, 59, 14, {
      align: 'left', color: ready ? '#000' : 'rgba(0,0,0,0.45)', double: false
    });
    const fill = ready ? 1 : 1 - this.parryCd / PARRY_COOLDOWN;
    if (fill > 0.02) {
      hatchRect(ctx, bx + 2, by + 2, (bw - 4) * fill, bh - 4, 5, 61, {
        angle: 0.8, color: ready ? '#000' : 'rgba(0,0,0,0.4)', width: 2, amp: 1.2
      });
    }
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.4;
    roughRect(ctx, bx, by, bw, bh, 67, 1.6);
    doodleText(ctx, ready ? 'READY' : this.parryCd.toFixed(1) + 's', bx + bw + 10, by + bh / 2, 71, 15, {
      align: 'left', color: ready ? '#000' : 'rgba(0,0,0,0.5)', double: false
    });

    // "PARRY!" shout while the shield is up
    if (this.parryT > 0 && this.player.alive) {
      doodleText(ctx, 'PARRY!', this.player.x, this.player.y - 44, 73 + CLOCK.tick9 * 0.11, 22);
    }

    // score / time
    const score = Math.floor(this.time * 100);
    doodleText(ctx, 'SCORE ' + score, this.w - 18, 22, 11, 22, { align: 'right' });
    doodleText(ctx, 'TIME ' + this.time.toFixed(1) + 's  ·  x' + this.difficulty.toFixed(1), this.w - 18, 48, 19, 16, {
      align: 'right', color: 'rgba(0,0,0,0.55)', double: false
    });

    // noclip tag
    if (this.noclip) {
      doodleText(ctx, 'NOCLIP', this.w - 62, 76, 47, 20, { align: 'center', color: 'rgba(0,0,0,0.8)' });
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.8;
      roughRect(ctx, this.w - 124, 62, 106, 28, 53, 2);
      ctx.restore();
    }

    // released-cosmos tag (phase 3 upgrades it to MAGNETAR)
    if (this.released) {
      doodleText(ctx, this.magnetar ? 'MAGNETAR' : 'RELEASED', this.w - 62, 76, 47, 19, { align: 'center', color: 'rgba(0,0,0,0.55)' });
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.6;
      roughRect(ctx, this.w - 130, 62, 136, 28, 59, 2);
      // tiny pulsar dot (wrapped in a field loop as a magnetar)
      Player.pulsarIcon(ctx, this.w - 154, 76, 6 + Math.sin(CLOCK.time * 5) * 1);
      if (this.magnetar) {
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.ellipse(this.w - 154, 76, 11 + Math.sin(CLOCK.time * 4) * 1.5, 7, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    // a ritual is ready: turn R from retry into a finale
    if (this.releaseReady) {
      const blink = Math.floor(CLOCK.time * 2.2) % 2 === 0;
      if (blink) {
        const rTxt = this.released ? 'R — BROKEN MEMORIES' : 'R — RELEASE THE STAR';
        doodleText(ctx, rTxt, this.w / 2, 118, 31 + CLOCK.tick9 * 0.09, 26, {
          color: 'rgba(0,0,0,0.9)', double: false
        });
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2.4;
        roughLine(ctx, this.w / 2 - 110, 134, this.w / 2 + 110, 134, 63, 3);
      }
    }

    // attack announcement
    if (this.label.t > 0 && this.state === 'playing') {
      const age = 1.8 - this.label.t;
      const a = clamp(Math.min(age / 0.2, this.label.t / 0.6), 0, 1);
      const y = 84;
      doodleText(ctx, '» ' + this.label.text + ' «', this.w / 2, y, 41 + CLOCK.tick9 * 0.07, 30, {
        color: `rgba(0,0,0,${(a * 0.9).toFixed(2)})`
      });
      ctx.strokeStyle = `rgba(0,0,0,${(a * 0.7).toFixed(2)})`;
      ctx.lineWidth = 3;
      const half = Math.min(this.w * 0.3, 240);
      roughLine(ctx, this.w / 2 - half, y + 22, this.w / 2 + half, y + 22, 77, 4);
    }
  }

  drawPause(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillRect(0, 0, this.w, this.h);
    doodleText(ctx, 'PAUSED', this.w / 2, this.h / 2 - 20, 5, 64);
    doodleText(ctx, 'press P to continue · ESC for menu', this.w / 2, this.h / 2 + 34, 9, 20, { color: 'rgba(0,0,0,0.6)', double: false });
  }

  drawDeath(ctx) {
    const a = clamp(this.deathT / 0.5, 0, 1);
    ctx.save();
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, this.w, this.h);

    const cx = this.w / 2;
    const cy = this.h * 0.34;
    const R = Math.min(70, this.w * 0.12);

    // eraser skull
    roughCirclePath(ctx, cx, cy, R, 13, 0.14, 24);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.stroke();
    // X eyes
    ctx.lineWidth = 4;
    roughLine(ctx, cx - R * 0.5 - 12, cy - 14, cx - R * 0.5 + 12, cy + 10, 21, 2);
    roughLine(ctx, cx - R * 0.5 + 12, cy - 14, cx - R * 0.5 - 12, cy + 10, 23, 2);
    roughLine(ctx, cx + R * 0.5 - 12, cy - 14, cx + R * 0.5 + 12, cy + 10, 25, 2);
    roughLine(ctx, cx + R * 0.5 + 12, cy - 14, cx + R * 0.5 - 12, cy + 10, 27, 2);
    // teeth
    for (let i = -2; i <= 2; i++) {
      roughLine(ctx, cx + i * 20 - 8, cy + R * 0.5, cx + i * 20 + 8, cy + R * 0.5, 31 + i, 2);
      roughLine(ctx, cx + i * 20, cy + R * 0.5, cx + i * 20, cy + R * 0.5 + 14, 37 + i, 1.5);
    }

    doodleText(ctx, 'ERASED', cx, cy + R + 66, 7, Math.min(72, this.w / 10));
    doodleText(ctx, 'SCORE  ' + this.score, cx, cy + R + 124, 11, 34);
    doodleText(ctx, 'BEST  ' + this.hi, cx, cy + R + 162, 17, 24, { color: 'rgba(0,0,0,0.7)' });
    doodleText(ctx, this.time.toFixed(1) + ' seconds of survival', cx, cy + R + 196, 23, 18, { color: 'rgba(0,0,0,0.55)', double: false });

    if (this.deathT > 0.6) {
      const blink = Math.floor(CLOCK.time * 2.5) % 2 === 0;
      if (blink) {
        doodleText(ctx, 'CLICK / R — RETRY', cx, this.h * 0.85, 29, 28);
      }
      doodleText(ctx, 'ESC — back to the menu', cx, this.h * 0.85 + 34, 33, 17, { color: 'rgba(0,0,0,0.55)', double: false });
    }
    ctx.restore();
  }

  /* ---------------- loop ---------------- */

  loop(ts) {
    if (!this._last) this._last = ts;
    const dt = clamp((ts - this._last) / 1000, 0.001, 0.034);
    this._last = ts;

    clockTick(dt);
    this.update(dt);
    this.draw();
    this.input.endFrame();

    requestAnimationFrame(this.loop);
  }
}
