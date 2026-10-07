'use strict';

/* ============================================================
   Player — a sloppy hand-drawn star with a silly face.
   • Hitbox is a MICROSCOPIC point (r = 2.2) in the middle of face.
   • Movement: snaps instantly to the cursor / finger (no easing),
     keyboard (WASD/arrows) as an alternative.
   ============================================================ */

const PLAYER_R = 2.2; // the honest, microscopic hitbox

function starPath(ctx, R, rIn, seed, amp) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * TAU / 10;
    const rr = (i % 2 === 0 ? R : rIn) + wob(seed + i * 7, 1.7);
    const px = Math.cos(a) * rr + wob(seed + i * 3.1, 1.3);
    const py = Math.sin(a) * rr + wob(seed + i * 5.3, 1.3);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

class Player {
  constructor(game) {
    this.game = game;
    this.r = PLAYER_R;
    this.reset(game.w, game.h);
  }

  reset(w, h) {
    this.x = w / 2;
    this.y = h * 0.62;
    this.vx = 0;
    this.vy = 0;
    this.fx = 0;               // external forces (black holes)
    this.fy = 0;
    this.lives = 3;
    this.invuln = 0;
    this.alive = true;
    this.rot = 0;
    this.mode = 'star';        // 'star' | 'pulsar' (after release)
    this.grabX = 0;            // touch grab offset (finger never covers the star)
    this.grabY = 0;
    this.blinkT = rnd(1.2, 3.6);
    this.blink = 0;
    this.lookX = 0;
    this.lookY = -1;
    this.trailT = 0;
  }

  hit() {
    if (!this.alive || this.invuln > 0) return false;
    if (this.game.noclip) return false;      // noclip = untouchable (all sources)
    this.lives--;
    this.invuln = 1.5;
    this.game.onPlayerHit();
    if (this.lives <= 0) {
      this.alive = false;
      this.game.onPlayerDeath();
    }
    return true;
  }

  update(dt, input) {
    if (!this.alive) return;
    const g = this.game;
    const p = input.pointer;
    const prevX = this.x, prevY = this.y;

    // external gravity (black holes) accumulates during enemy updates
    const pullX = this.fx, pullY = this.fy;
    this.fx = 0;
    this.fy = 0;

    // touch grab offset must be established before targeting
    if (p.justDown && p.isTouch) {
      this.grabX = this.x - p.x;
      this.grabY = this.y - p.y;
    }

    let handled = false;
    const ax = input.axis();
    if (ax.x || ax.y) {
      const sp = 620;
      this.x += ax.x * sp * dt;
      this.y += ax.y * sp * dt;
      this.grabX = 0;
      this.grabY = 0;
      handled = true;
    }

    if (!handled && p.seen && (!p.isTouch || p.down)) {
      // instant, zero-latency snap to cursor / finger
      this.x = p.x + this.grabX;
      this.y = p.y + this.grabY;
    }

    // hazard forces applied after the snap
    this.x += pullX * dt;
    this.y += pullY * dt;

    this.x = clamp(this.x, 14, g.w - 14);
    this.y = clamp(this.y, 14, g.h - 14);

    this.vx = dt > 0 ? (this.x - prevX) / dt : 0;
    this.vy = dt > 0 ? (this.y - prevY) / dt : 0;

    // body tilt follows movement
    this.rot = lerp(this.rot, clamp(this.vx * 0.00045, -0.42, 0.42), Math.min(1, dt * 12));

    // eyes look at the pointer target (or travel direction)
    let lx, ly;
    if (p.seen && (!p.isTouch || p.down)) { lx = p.x - this.x; ly = p.y - this.y; }
    else { lx = this.vx; ly = this.vy; }
    const ll = Math.hypot(lx, ly);
    if (ll > 1) { this.lookX = lx / ll; this.lookY = ly / ll; }

    // blink
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 0.12; this.blinkT = rnd(1.6, 4.4); }
    if (this.blink > 0) this.blink -= dt;
    if (this.invuln > 0) this.invuln -= dt;

    // speedy doodle trail
    const speed = Math.hypot(this.vx, this.vy);
    this.trailT -= dt;
    if (speed > 420 && this.trailT <= 0) {
      this.trailT = 0.03;
      g.bullets.spawnParticle({
        x: this.x + rnd(-4, 4), y: this.y + rnd(-4, 4),
        vx: rnd(-20, 20), vy: rnd(-20, 20),
        life: 0.35, size: rnd(1.5, 3.4), g: rint(150, 210), drag: 5
      });
    }
  }

  draw(ctx, scale = 1) {
    if (!this.alive) return;
    if (this.mode === 'pulsar') { this.drawPulsar(ctx); return; }
    const flicker = this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0;
    const seed = 41;

    ctx.save();
    ctx.globalAlpha = flicker ? 0.35 : 1;
    ctx.translate(this.x, this.y);
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    /* ---- rotating star body (two sloppy strokes) ---- */
    ctx.save();
    ctx.rotate(this.rot);
    starPath(ctx, 16, 7.2, seed, 1.7);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    starPath(ctx, 16.4, 7.4, seed + 77, 2.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();

    /* ---- face: normal | pain (inflating) | wide (rays burst out) ---- */
    const face = this.game.csFace;
    const er = 5.1;

    if (face === 'pain') {
      // everything hurts: slanted agonized brows, squeezed-shut eyes, open scream
      for (const s of [-1, 1]) {
        const ex = s * 5.7 + wob(seed + s * 9, 0.5);
        const ey = -3.4 + wob(seed + s * 4, 0.5);
        // brows droop toward the nose
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        roughLine(ctx, ex + s * 2.2, ey - 4.8, ex - s * 2.6, ey - 2.2, seed + s * 5 + 200, 1.3);
        // squeezed-shut lids bulging downward in pain
        ctx.beginPath();
        ctx.moveTo(ex - er * 1.05, ey - 0.4);
        ctx.quadraticCurveTo(ex, ey + 3.2 + wob(seed + s * 13, 0.8), ex + er * 1.05, ey - 0.4);
        ctx.lineWidth = 3.4;
        ctx.stroke();
      }
      // wide screaming mouth
      ctx.save();
      ctx.translate(wob(seed + 66, 0.7), 7.6 + wob(seed + 71, 0.7));
      roughEllipsePath(ctx, 0, 0, 4.4, 6.6, seed + 73, 0.12, 10);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();
    } else if (face === 'wide') {
      // white void eyes spitting pulsar rays + a black-hole scream
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 5.7 + wob(seed + s * 9, 0.5), -3.4 + wob(seed + s * 4, 0.5));
        // the eye: a big white void with a thin ring (no pupil)
        roughEllipsePath(ctx, 0, 0, er * 1.35, er * 1.5, seed + s * 17 + 300, 0.08, 12);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        // pulsar rays bursting out of the eye (up and away from the face)
        const outA = s === -1 ? -Math.PI * 0.78 : -Math.PI * 0.22;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          const a = outA + (i - 2) * 0.42 + Math.sin(CLOCK.time * 8 + i * 2) * 0.12;
          const len = 11 + Math.sin(CLOCK.time * 9 + i * 2.7) * 3 + i * 1.6;
          const r0 = er * 1.45;
          roughLine(ctx, Math.cos(a) * r0, Math.sin(a) * r0,
            Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len), seed + s * 29 + i * 13, 2);
        }
        ctx.restore();
      }
      // open maw
      ctx.save();
      ctx.translate(wob(seed + 80, 0.7), 8.4 + wob(seed + 83, 0.7));
      roughEllipsePath(ctx, 0, 0, 5.2, 7.6, seed + 87, 0.1, 12);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();
    } else {

    /* ---- big animated eyes ---- */
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * 5.7 + wob(seed + s * 9, 0.5), -3.4 + wob(seed + s * 4, 0.5));
      roughEllipsePath(ctx, 0, 0, er, er * 1.16, seed + s * 17, 0.08, 12);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      if (this.blink > 0) {
        ctx.beginPath();
        ctx.moveTo(-er, 0.5);
        ctx.lineTo(er, 0.5);
        ctx.lineWidth = 2.6;
        ctx.stroke();
      } else {
        const px = clamp(this.lookX * 2.6, -2.7, 2.7);
        const py = clamp(this.lookY * 2.6, -3, 3);
        ctx.beginPath();
        ctx.arc(px, py, 2.8, 0, TAU);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px - 1.1, py - 1.3, 1.05, 0, TAU);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
      ctx.restore();
    }

    /* ---- silly mouth ---- */
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4.4, 6.2);
    ctx.quadraticCurveTo(-2, 8.8 + wob(seed + 31, 1.2), 0, 6.6);
    ctx.quadraticCurveTo(2, 8.8 + wob(seed + 37, 1.2), 4.4, 6.1);
    ctx.stroke();
    }

    /* ---- tiny ink feet / scribbles ---- */
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    roughLine(ctx, -3.4, 12.6, -5.6, 15.4, seed + 51, 1.2);
    roughLine(ctx, 3.6, 12.4, 5.8, 15.2, seed + 57, 1.2);

    /* ---- noclip aura: dashed halo = damage is off ---- */
    if (this.game.noclip) {
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.8;
      roughCircle(ctx, 0, 0, 25 + Math.sin(CLOCK.time * 4) * 2, seed + 97, 0.09, 22);
      ctx.setLineDash([]);
      ctx.restore();
    }

    /* ---- parry shield: solid white ring + dashed black rim ---- */
    if (this.game.parryT > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fill();
      ctx.setLineDash([9, 7]);
      ctx.lineDashOffset = -CLOCK.time * 60;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      roughCircle(ctx, 0, 0, 38, seed + 111, 0.06, 24);
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.restore();
  }

  /** mini star icon (HUD lives) */
  static icon(ctx, x, y, scale, filled) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    starPath(ctx, 10, 4.4, 13 + x, 1.2);
    ctx.fillStyle = filled ? '#000' : '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  /** tiny pulsar dot for the HUD "RELEASED" tag */
  static pulsarIcon(ctx, x, y, R) {
    ctx.save();
    ctx.translate(x, y);
    roughCirclePath(ctx, 0, 0, R, 301, 0.14, 7);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-R * 0.3, -R * 0.1, R * 0.2, 0, TAU);
    ctx.arc(R * 0.3, -R * 0.1, R * 0.2, 0, TAU);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  }

  /** the collapsed star: a breathing pulsar. Reads game.csFace
      during rituals ('angry' — the copies strike; 'calm' — the
      field won) and grows a colossal magnetosphere as MAGNETAR. */
  drawPulsar(ctx) {
    const seed = 41;
    const g = this.game;
    const face = g.csFace;   // null | 'angry' | 'calm'
    const cx = this.x, cy = this.y;
    const R = 13 + Math.sin(CLOCK.time * 6.5) * 1.6;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // magnetar magnetosphere: three plain rings, each sliding in its
    // own direction (see fieldRings in core/utils.js)
    if (g.magnetar) fieldRings(ctx, cx, cy, R, 1, seed + 210);

    // rotating corona beams
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(CLOCK.time * 1.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2.6;
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6;
      const r1 = R + 10, r2 = R + 26 + Math.sin(CLOCK.time * 9 + i * 2) * 5;
      roughLine(ctx, Math.cos(a) * r1, Math.sin(a) * r1,
        Math.cos(a) * r2, Math.sin(a) * r2, seed + i * 9, 3.5);
    }
    ctx.restore();

    // pulsing grey halo
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 10;
    roughCircle(ctx, cx, cy, R + 6 + Math.sin(CLOCK.time * 6) * 2, seed + 7, 0.2, 18);

    // core (once inverted this gleams white)
    roughCirclePath(ctx, cx, cy, R, seed + 13, 0.12, 16);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // face
    const er = R * 0.34;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * R * 0.34, -R * 0.12 + wob(seed + s * 4, 0.4));
      roughEllipsePath(ctx, 0, 0, er, er * 1.15, seed + s * 17, 0.08, 10);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (face === 'calm') {
        // closed, content lids — the field won
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-er * 0.85, er * 0.05);
        ctx.quadraticCurveTo(0, er * 0.75, er * 0.85, er * 0.05);
        ctx.stroke();
      } else {
        const px = clamp(this.lookX * er * 0.5, -er * 0.5, er * 0.5);
        const py = clamp(this.lookY * er * 0.5, -er * 0.55, er * 0.5);
        ctx.beginPath();
        ctx.arc(px, py, er * 0.55, 0, TAU);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px - er * 0.2, py - er * 0.2, er * 0.18, 0, TAU);
        ctx.fillStyle = '#fff';
        ctx.fill();

        if (face === 'angry') {
          // irritated brows slanting down toward the nose
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2.6;
          roughLine(ctx, s * er * 1.1, -er * 1.5, -s * er * 0.7, -er * 0.6, seed + s * 300, 1.4);
        }
      }
      ctx.restore();
    }

    // mouth: smug grin | irritated grit | relaxed smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    if (face === 'angry') {
      ctx.beginPath();
      ctx.moveTo(-R * 0.32, R * 0.44);
      for (let i = 1; i <= 4; i++) {
        const xx = -R * 0.32 + R * 0.64 * (i / 4);
        ctx.lineTo(xx, R * (i % 2 === 0 ? 0.44 : 0.24) + wob(seed + i * 9, 0.5));
      }
      ctx.stroke();
    } else if (face === 'calm') {
      ctx.beginPath();
      ctx.moveTo(-R * 0.26, R * 0.3);
      ctx.quadraticCurveTo(0, R * 0.54 + wob(seed + 31, 0.6), R * 0.26, R * 0.3);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-R * 0.3, R * 0.3);
      ctx.quadraticCurveTo(0, R * 0.62 + wob(seed + 31, 1), R * 0.3, R * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }
}
