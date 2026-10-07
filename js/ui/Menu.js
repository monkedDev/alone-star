'use strict';

/* ============================================================
   MENU — "alone star" still-life art object.
   • LEFT COLUMN: every button lives here — START, the SKIP
     start-second picker (0–150s, persisted), the NOCLIP toggle,
     and a HOW TO SURVIVE block right beneath them.
   • CENTRE-PIECE: a black hole is slowly pulling our star into
     it — she spirals in on a smear-trail, eyes going wide, until
     the next cycle drags her back out again. The star herself is
     a fixed 2x of her standard in-game size. (mystery of space...)
   • strict 9 FPS wobble on every stroke (Menu is stepped on
     CLOCK.tick9 like the rest of the ink)
   • START button drawn with fat sloppy strokes; on hover its
     internal hatching runs around chaotically
   ============================================================ */

const SKIP_MAX = 150;  // same as MAGNETAR_AT; skipping to 150 chains BOTH rituals

class Menu {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.hi = 0;
    this.hover = false;
    this.hoverL = false;
    this.hoverR = false;
    this.hover2 = false;
    this.blinkT = rnd(1.5, 3.5);
    this.blink = 0;
    this.starTrail = [];          // the star's spiral smear into the hole
    this.startSec = parseInt(localStorage.getItem('doodlehell.skip') || '0', 10) || 0;
    this.startSec = clamp(this.startSec, 0, SKIP_MAX);
    this.glyphs = [];
    for (let i = 0; i < 10; i++) {
      this.glyphs.push({ u: rnd(0.05, 0.95), v: rnd(0.08, 0.95), kind: rint(0, 4), seed: rnd(1000), drift: rnd(-0.01, 0.01) });
    }
  }

  layout() {
    const g = this.game;
    const colW = Math.min(300, Math.max(178, g.w * 0.3));
    const colX = Math.max(16, g.w * 0.04);
    const R = Math.min(g.w, g.h) * 0.19;
    const logo = {
      cx: clamp(g.w * 0.56,
        colX + colW + R + 40,
        Math.max(colX + colW + R + 40, g.w - R * 1.35 - 28)),
      cy: g.h * 0.44,
      R
    };
    const top = Math.max(56, g.h * 0.09);
    return {
      col: { x: colX, w: colW },
      logo,
      title: { cx: logo.cx, cy: logo.cy - R * 1.5 },
      btn: { x: colX, y: top, w: colW, h: 60 },
      skip: { x: colX, y: top + 82, w: colW, h: 54 },
      skipL: { x: colX + 6, y: top + 86, w: 42, h: 46 },
      skipR: { x: colX + colW - 48, y: top + 86, w: 42, h: 46 },
      ruler: { x: colX, y: top + 150, w: colW },
      btn2: { x: colX, y: top + 166, w: colW, h: 44 },
      instr: { x: colX, y: top + 230, w: colW }
    };
  }

  setStart(n) {
    this.startSec = clamp(Math.round(n / 10) * 10, 0, SKIP_MAX);
    try { localStorage.setItem('doodlehell.skip', String(this.startSec)); } catch (_) {}
    this.game.notify('START FROM ' + this.startSec + 's');
  }

  /* ---------------- update ---------------- */

  update(dt) {
    this.t += dt;
    const g = this.game;
    const L = this.layout();
    const p = g.input.pointer;

    // the star blinks sometimes
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.12;
      this.blinkT = rnd(2.2, 4.6);
    }
    if (this.blink > 0) this.blink -= dt;

    // buttons
    const px = p.seen ? p.x : -999, py = p.seen ? p.y : -999;
    const inRect = (r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    this.hover = inRect(L.btn);
    this.hoverL = inRect(L.skipL);
    this.hoverR = inRect(L.skipR);
    this.hover2 = inRect(L.btn2);

    const startTapped = g.input.tapped('Enter') || g.input.tapped('Space');
    if ((this.hover && p.justDown) || startTapped) g.start(this.startSec);
    else if (this.hoverL && p.justDown) this.setStart(this.startSec - 10);
    else if (this.hoverR && p.justDown) this.setStart(this.startSec + 10);
    else if (this.hover2 && p.justDown) g.toggleNoclip();
  }

  /* ---------------- draw ---------------- */

  draw(ctx) {
    const g = this.game;
    const L = this.layout();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    /* ambient drifting doodles */
    for (const gl of this.glyphs) {
      gl.u += gl.drift * 0.016;
      if (gl.u > 1) gl.u = 0;
      if (gl.u < 0) gl.u = 1;
      const x = gl.u * g.w, y = gl.v * g.h;
      const s = 10 + hash1(gl.seed + CLOCK.tick9 * 0.3) * 8;
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 2;
      if (gl.kind === 0) roughCircle(ctx, x, y, s, gl.seed + CLOCK.tick9, 0.3, 9);
      else if (gl.kind === 1) {
        roughLine(ctx, x - s, y, x + s, y, gl.seed, 2);
        roughLine(ctx, x, y - s, x, y + s, gl.seed + 3, 2);
      } else if (gl.kind === 2) doodleText(ctx, '?', x, y, gl.seed + CLOCK.tick9, s * 1.6, { color: 'rgba(0,0,0,0.3)', double: false });
      else if (gl.kind === 3) doodleText(ctx, '!', x, y, gl.seed + CLOCK.tick9, s * 1.6, { color: 'rgba(0,0,0,0.3)', double: false });
      else {
        roughLine(ctx, x - s, y - s, x + s, y - s, gl.seed + 1, 2);
        roughLine(ctx, x + s, y - s, x - s, y + s, gl.seed + 5, 3);
      }
    }

    /* ------- the black hole pulling our star in ------- */
    this.drawScene(ctx, L);

    /* ---------- title + the mystery ---------- */
    doodleText(ctx, 'alone star', L.title.cx, L.title.cy, 5 + CLOCK.tick9 * 0.1, Math.min(78, g.w / 10));
    doodleText(ctx, 'mystery of space...', L.title.cx, L.title.cy + 30, 91 + CLOCK.tick9 * 0.1, 21, { color: 'rgba(0,0,0,0.62)', double: false });

    /* ---------- LEFT COLUMN: START button ---------- */
    const b = L.btn;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);

    if (this.hover) {
      hatchRect(ctx, b.x + 4, b.y + 4, b.w - 8, b.h - 8, 9, this.t * 100, {
        angle: 0.85 + Math.sin(this.t * 4.2) * 0.4,
        color: 'rgba(0,0,0,0.35)',
        width: 2.6,
        amp: 2.2,
        offset: (CLOCK.tick9 * 4.3) % 9
      });
      if (chance(0.6)) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 3;
        const sx = rnd(-20, 20);
        roughLine(ctx, b.x + sx, b.y + rnd(0, b.h), b.x + b.w + sx, b.y + rnd(0, b.h), CLOCK.tick9 * 3.1, 6);
      }
    }

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 9;
    roughRect(ctx, b.x, b.y, b.w, b.h, 13, 4);
    ctx.lineWidth = 5;
    roughRect(ctx, b.x + 3, b.y - 2, b.w - 5, b.h + 4, 29, 5);
    ctx.lineWidth = 2.5;
    roughRect(ctx, b.x - 3, b.y + 3, b.w + 6, b.h - 6, 47, 6);

    doodleText(ctx, 'START', b.x + b.w / 2, b.y + b.h / 2, 7 + CLOCK.tick9 * 0.23, 42);
    ctx.restore();

    /* ---------- SKIP start-second picker ---------- */
    const s = L.skip;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(s.x - 6, s.y - 6, s.w + 12, s.h + 12);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    roughRect(ctx, s.x, s.y, s.w, s.h, 67, 3);
    ctx.lineWidth = 2;
    roughRect(ctx, s.x + 2, s.y - 2, s.w - 4, s.h + 3, 83, 3.4);

    // left / right step squares
    for (const [r, ch, hov] of [[L.skipL, '◀', this.hoverL], [L.skipR, '▶', this.hoverR]]) {
      ctx.save();
      if (hov) {
        hatchRect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 7, this.t * 90, {
          color: 'rgba(0,0,0,0.28)', width: 2.2, amp: 2, offset: (CLOCK.tick9 * 3.7) % 7
        });
      }
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3.4;
      roughRect(ctx, r.x, r.y, r.w, r.h, 11, 2.6);
      doodleText(ctx, ch, r.x + r.w / 2, r.y + r.h / 2, 13 + (ch === '◀' ? 0 : 7), 26, { color: 'rgba(0,0,0,0.85)' });
      ctx.restore();
    }

    // the chosen second, big in the middle
    doodleText(ctx, 'START FROM', s.x + s.w / 2, s.y + 12, 97, 12, { color: 'rgba(0,0,0,0.5)', double: false });
    doodleText(ctx, this.startSec + 's', s.x + s.w / 2, s.y + 36, 101 + CLOCK.tick9 * 0.1, 26);
    ctx.restore();

    // tiny ruler under the picker: taps every 30s up to SKIP_MAX
    const rl = L.ruler;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    roughLine(ctx, rl.x + 4, rl.y, rl.x + rl.w - 4, rl.y, 121, 2);
    for (let n = 0; n <= SKIP_MAX; n += 30) {
      const tx = rl.x + 4 + (rl.w - 8) * (n / SKIP_MAX);
      roughLine(ctx, tx, rl.y - 5, tx, rl.y + 5, 131 + n, 1.6);
    }
    const mx = rl.x + 4 + (rl.w - 8) * (this.startSec / SKIP_MAX);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(mx - 6, rl.y - 6);
    ctx.lineTo(mx + 6, rl.y - 6);
    ctx.lineTo(mx, rl.y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* ---------- NOCLIP toggle ---------- */
    const n = L.btn2;
    ctx.save();
    ctx.fillStyle = g.noclip ? 'rgba(226,226,226,0.95)' : 'rgba(255,255,255,0.92)';
    ctx.fillRect(n.x - 6, n.y - 6, n.w + 12, n.h + 12);

    if (g.noclip) {
      hatchRect(ctx, n.x + 3, n.y + 3, n.w - 6, n.h - 6, 8, 61 + CLOCK.tick9, {
        angle: 0.9, color: 'rgba(0,0,0,0.22)', width: 2.2, amp: 2, offset: (CLOCK.tick9 * 3.7) % 8
      });
    } else if (this.hover2) {
      hatchRect(ctx, n.x + 3, n.y + 3, n.w - 6, n.h - 6, 8, this.t * 100, {
        angle: 0.85 + Math.sin(this.t * 4.2) * 0.4,
        color: 'rgba(0,0,0,0.35)', width: 2.4, amp: 2.2, offset: (CLOCK.tick9 * 4.3) % 8
      });
    }

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    roughRect(ctx, n.x, n.y, n.w, n.h, 67, 3);
    ctx.lineWidth = 3;
    roughRect(ctx, n.x + 2, n.y - 2, n.w - 4, n.h + 3, 83, 4);

    doodleText(ctx, 'NOCLIP: ' + (g.noclip ? 'ON' : 'OFF'), n.x + n.w / 2, n.y + n.h / 2,
      11 + CLOCK.tick9 * 0.19, 22, { color: g.noclip ? '#000' : 'rgba(0,0,0,0.8)' });
    ctx.restore();

    /* ---------- HOW TO SURVIVE (same left column) ---------- */
    const it = L.instr;
    doodleText(ctx, 'HOW TO SURVIVE', it.x, it.y, 13, 15, { align: 'left', color: 'rgba(0,0,0,0.8)' });
    const lines = [
      'star follows mouse / finger',
      'WASD · arrows — move · SPACE — parry',
      'P pause · ESC menu · N noclip',
      'R retry — at 90s it\'s RELEASE',
      'R at 150s — BROKEN MEMORIES',
      'SKIP — start from any second (0–150)'
    ];
    for (let i = 0; i < lines.length; i++) {
      doodleText(ctx, lines[i], it.x + 2, it.y + 26 + i * 21, 17 + i * 7, 14, {
        align: 'left', color: 'rgba(0,0,0,0.55)', double: false
      });
    }
    if (this.hi > 0) {
      doodleText(ctx, 'BEST: ' + this.hi, it.x + 2, it.y + 26 + lines.length * 21 + 8, 31, 20, {
        align: 'left', color: 'rgba(0,0,0,0.75)'
      });
    }
  }

  /* ------- the black hole + the star it is pulling in ------- */

  drawScene(ctx, L) {
    const t = this.t;
    const cx = L.logo.cx, cy = L.logo.cy, R = L.logo.R;

    // faint pull-field orbit ellipses around the hole
    for (let i = 0; i < 3; i++) {
      const rr = R * (1.55 + i * 0.45) + Math.sin(t * 0.9 + i * 1.4) * 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 14]);
      roughEllipsePath(ctx, cx, cy, rr, rr * 0.5, 211 + i * 9, 0.2, 20);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // grey haze
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 6 + i * 3.4;
      roughCircle(ctx, cx, cy, R * (1.02 + i * 0.4) + wob(221 + i, 6), 221 + i * 9, 0.22, 18);
    }

    // rotating accretion spiral (the ink falling in)
    const spin = t * 1.05;
    for (let arm = 0; arm < 3; arm++) {
      const pts = [];
      for (let s = 0; s <= 36; s++) {
        const k = s / 36;
        const rr = R * 0.16 + k * R * 1.45;
        const a = arm * TAU / 3 + k * 3.9 + spin;
        pts.push({
          x: cx + Math.cos(a) * rr + wob(231 + arm * 31 + s, 3),
          y: cy + Math.sin(a) * rr * 0.62 + wob(231 + arm * 57 + s, 3)
        });
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 8;
      roughPath(ctx, pts, 233 + arm * 13, 2.4);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3.4;
      roughPath(ctx, pts, 237 + arm * 17 + 3, 2.2);
    }

    // solid core + white chaos scribble inside
    roughCirclePath(ctx, cx, cy, R * 0.36, 271, 0.26, 16);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a1 = 231 + i * 93 + CLOCK.tick9 * 3;
      const rr = R * 0.16;
      roughLine(ctx, cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr,
        cx - Math.cos(a1) * rr * 1.1, cy - Math.sin(a1) * rr * 1.1, 277 + i * 7, 3);
    }

    // pull chevrons sinking toward the horizon
    for (let i = 0; i < 4; i++) {
      const a = t * 0.55 + i * TAU / 4 + 0.55;
      const rr = R * (0.95 + 0.2 * Math.sin(t * 1.9 + i * 2.1));
      const x1 = cx + Math.cos(a) * rr, y1 = cy + Math.sin(a) * rr * 0.62;
      const x2 = cx + Math.cos(a) * (rr - 11), y2 = cy + Math.sin(a) * (rr - 11) * 0.62;
      const px = -Math.sin(a), py = Math.cos(a) * 0.62;
      const f = 0.3 + 0.25 * Math.sin(t * 2.6 + i * 1.7);
      ctx.strokeStyle = `rgba(0,0,0,${(0.12 + f * 0.3).toFixed(2)})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x1 + px * 5, y1 + py * 5);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x1 - px * 5, y1 - py * 5);
      ctx.stroke();
    }

    /* ---- the star spiralling toward the hole ---- */
    const para = (t * 0.055) % 1;
    const ang0 = t * 2.6 + para * TAU * 1.5;
    const rr = R * (0.14 + (1 - easeInCubic(para)) * 0.92);
    const sx = cx + Math.cos(ang0) * rr;
    const sy = cy + Math.sin(ang0) * rr * 0.6 + wob(301, 2);
    this.starTrail.push({ x: sx, y: sy });
    if (this.starTrail.length > 22) this.starTrail.shift();

    // the smear she leaves behind
    for (let i = 0; i < this.starTrail.length; i++) {
      const tr = this.starTrail[i];
      const a = (i + 1) / this.starTrail.length;
      ctx.strokeStyle = `rgba(0,0,0,${(0.26 * a).toFixed(2)})`;
      ctx.lineWidth = 1.6;
      roughCircle(ctx, tr.x, tr.y, 2.6 * a + wob(503 + i * 7, 0.6), 503 + i * 7, 0.5, 6);
    }

    // her body, slowly spinning — a fixed 2x of the hero star's
    // standard size, so she reads as the exact same little star
    // from the game being dragged in
    const sc = 2 * (0.98 + wob(307, 0.02));
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t * 0.5 * (1 - para * 0.4));
    ctx.scale(sc, sc);
    starPath(ctx, 16, 7.2, 41, 1.7);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    starPath(ctx, 16.4, 7.4, 41 + 77, 2.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    this.drawStarFace(ctx, para, this.blink);
    ctx.restore();
  }

  /** the star's face as she gets swallowed — hero units (caller scales) */
  drawStarFace(ctx, para, blink) {
    let expr = 'happy';
    if (para > 0.4) expr = 'worried';
    if (para > 0.74) expr = 'scared';

    const er = 5.1;
    for (const s of [-1, 1]) {
      const ex = s * 5.7 + wob(41 + s * 9, 0.5);
      const ey = -3.4 + wob(41 + s * 4, 0.5);
      if (blink > 0) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(ex - er * 1.1, ey + 0.5);
        ctx.lineTo(ex + er * 1.1, ey + 0.5);
        ctx.stroke();
        continue;
      }
      roughEllipsePath(ctx, ex, ey, er, er * 1.16, 41 + s * 17, 0.08, 12);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      if (expr === 'scared') {
        ctx.beginPath();
        ctx.arc(ex, ey, 2.2, 0, TAU);
        ctx.fillStyle = '#000';
        ctx.fill();
      } else if (expr === 'worried') {
        ctx.beginPath();
        ctx.arc(ex, ey + 0.4, 2.5, 0, TAU);
        ctx.fillStyle = '#000';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(ex, ey, 2.8, 0, TAU);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex - 1.1, ey - 1.3, 1.05, 0, TAU);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
    }

    // worried brows the moment she feels the pull
    if (expr !== 'happy') {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      for (const s of [-1, 1]) {
        roughLine(ctx, s * 5.7 + s * 2.2 - 1, -8.4, s * 5.7 - s * 2.4, -6, 41 + s * 5 + 200, 1.2);
      }
    }

    // mouth: smile -> wobbly little O -> open wail
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (expr === 'happy') {
      ctx.beginPath();
      ctx.moveTo(-4.4, 6.2);
      ctx.quadraticCurveTo(-2, 8.8 + wob(41 + 31, 1.2), 0, 6.6);
      ctx.quadraticCurveTo(2, 8.8 + wob(41 + 37, 1.2), 4.4, 6.1);
      ctx.stroke();
    } else if (expr === 'worried') {
      roughEllipsePath(ctx, 0, 7, 1.9, 1.5, 41 + 73, 0.2, 8);
      ctx.fillStyle = '#000';
      ctx.fill();
    } else {
      roughEllipsePath(ctx, 0, 7.4, 3.2, 4.2, 41 + 87, 0.14, 10);
      ctx.fillStyle = '#000';
      ctx.fill();
    }
  }
}