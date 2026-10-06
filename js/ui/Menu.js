'use strict';

/* ============================================================
   MENU — "alone star" still-life art object.
   • a happy hand-drawn star gently bounces and plays with a
     tiny pulsar that hops around her on a lopsided orbit
   • the star's eyes follow the pulsar; when it comes close
     she squints in joy and her smile widens
   • strict 9 FPS wobble on every stroke (Menu is stepped on
     CLOCK.tick9 like the rest of the ink)
   • START button drawn with fat sloppy strokes; on hover its
     internal hatching runs around chaotically
   ============================================================ */

class Menu {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.hi = 0;
    this.hover = false;
    this.hover2 = false;
    this.blinkT = rnd(1.5, 3.5);
    this.blink = 0;
    this.plTrail = [];          // the pulsar's hop trail
    this.glyphs = [];
    for (let i = 0; i < 12; i++) {
      this.glyphs.push({ u: rnd(0.05, 0.95), v: rnd(0.08, 0.95), kind: rint(0, 4), seed: rnd(1000), drift: rnd(-0.01, 0.01) });
    }
  }

  layout() {
    const g = this.game;
    const R = Math.min(g.w, g.h) * 0.17;
    const cx = g.w / 2;
    const cy = g.h * 0.42;
    const btnY = Math.min(g.h - 300, cy + R * 1.7 + 54);
    return {
      cx, cy, R,
      btn: { x: cx - 150, y: btnY, w: 300, h: 96 },
      btn2: { x: cx - 130, y: btnY + 110, w: 260, h: 56 }  // NOCLIP toggle
    };
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
    this.hover2 = inRect(L.btn2);

    const startTapped = g.input.tapped('Enter') || g.input.tapped('Space');
    if ((this.hover && p.justDown) || startTapped) g.start();
    else if (this.hover2 && p.justDown) g.toggleNoclip();
  }

  /* ---------------- draw ---------------- */

  draw(ctx) {
    const g = this.game;
    const L = this.layout();
    const B = g.bullets;
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

    /* ------- the star playing with her tiny pulsar ------- */
    this.drawScene(ctx, L);

    /* ---------- title ---------- */
    doodleText(ctx, 'alone star', g.w / 2, L.cy - L.R - 62, 5 + CLOCK.tick9 * 0.1, Math.min(80, g.w / 10));
    doodleText(ctx, 'a bullet hell in a notebook · monochrome inks', g.w / 2, L.cy - L.R - 14, 91 + CLOCK.tick9 * 0.1, 19, { color: 'rgba(0,0,0,0.6)', double: false });

    /* ---------- START button ---------- */
    const b = L.btn;
    ctx.save();
    // white plate so the scene doesn't eat the button
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);

    // chaotic hatching on hover — re-offset every 9 FPS tick
    if (this.hover) {
      hatchRect(ctx, b.x + 4, b.y + 4, b.w - 8, b.h - 8, 9, this.t * 100, {
        angle: 0.85 + Math.sin(this.t * 4.2) * 0.4,
        color: 'rgba(0,0,0,0.35)',
        width: 2.6,
        amp: 2.2,
        offset: (CLOCK.tick9 * 4.3) % 9
      });
      // random extra slashes each tick
      if (chance(0.6)) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 3;
        const sx = rnd(-20, 20);
        roughLine(ctx, b.x + sx, b.y + rnd(0, b.h), b.x + b.w + sx, b.y + rnd(0, b.h), CLOCK.tick9 * 3.1, 6);
      }
    }

    // fat sloppy border (three overlapping strokes)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 9;
    roughRect(ctx, b.x, b.y, b.w, b.h, 13, 4);
    ctx.lineWidth = 5;
    roughRect(ctx, b.x + 3, b.y - 2, b.w - 5, b.h + 4, 29, 5);
    ctx.lineWidth = 2.5;
    roughRect(ctx, b.x - 3, b.y + 3, b.w + 6, b.h - 6, 47, 6);

    doodleText(ctx, 'START', b.x + b.w / 2, b.y + b.h / 2, 7 + CLOCK.tick9 * 0.23, 48);
    ctx.restore();

    /* ---------- NOCLIP toggle ---------- */
    const n = L.btn2;
    ctx.save();
    ctx.fillStyle = g.noclip ? 'rgba(226,226,226,0.95)' : 'rgba(255,255,255,0.92)';
    ctx.fillRect(n.x - 6, n.y - 6, n.w + 12, n.h + 12);

    if (g.noclip) {
      // armed: permanent grey hatch that still jitters at 9 FPS
      hatchRect(ctx, n.x + 3, n.y + 3, n.w - 6, n.h - 6, 8, 61 + CLOCK.tick9, {
        angle: 0.9,
        color: 'rgba(0,0,0,0.22)',
        width: 2.2,
        amp: 2,
        offset: (CLOCK.tick9 * 3.7) % 8
      });
    } else if (this.hover2) {
      hatchRect(ctx, n.x + 3, n.y + 3, n.w - 6, n.h - 6, 8, this.t * 100, {
        angle: 0.85 + Math.sin(this.t * 4.2) * 0.4,
        color: 'rgba(0,0,0,0.35)',
        width: 2.4,
        amp: 2.2,
        offset: (CLOCK.tick9 * 4.3) % 8
      });
    }

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    roughRect(ctx, n.x, n.y, n.w, n.h, 67, 3);
    ctx.lineWidth = 3;
    roughRect(ctx, n.x + 2, n.y - 2, n.w - 4, n.h + 3, 83, 4);

    doodleText(ctx, 'NOCLIP: ' + (g.noclip ? 'ON' : 'OFF'), n.x + n.w / 2, n.y + n.h / 2,
      11 + CLOCK.tick9 * 0.19, 25, { color: g.noclip ? '#000' : 'rgba(0,0,0,0.8)' });
    ctx.restore();

    /* ---------- hints & hi-score ---------- */
    const hy = n.y + n.h;
    doodleText(ctx, 'mouse / finger — the star follows instantly', g.w / 2, hy + 32, 17, 17, { color: 'rgba(0,0,0,0.55)', double: false });
    doodleText(ctx, 'WASD · SPACE parry (0.2s / 10s cd) · P pause · N noclip', g.w / 2, hy + 58, 20, 17, { color: 'rgba(0,0,0,0.55)', double: false });
    doodleText(ctx, 'R: retry — after 90s in hell it becomes RELEASE', g.w / 2, hy + 84, 24, 16, { color: 'rgba(0,0,0,0.55)', double: false });
    if (this.hi > 0) {
      doodleText(ctx, 'BEST: ' + this.hi, g.w / 2, hy + 118, 31, 22, { color: 'rgba(0,0,0,0.75)' });
    }
  }

  /* ------- the menu's still life: happy star + little pulsar ------- */

  drawScene(ctx, L) {
    const t = this.t;
    const R = L.R;
    const s = R / 16;                     // star body is drawn in "hero" units (R=16)

    // the pulsar's playful lopsided orbit + excited hops
    const ang = t * 1.15;
    const orb = R * (0.52 + Math.sin(t * 2.4) * 0.09);
    const hop = Math.abs(Math.sin(t * 3.4)) * R * 0.16;
    const pp = {
      x: L.cx + Math.cos(ang) * orb,
      y: L.cy + Math.sin(ang) * orb * 0.6 - hop
    };

    // soft playground shadow under the pair
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.ellipse(L.cx, L.cy + R * 0.95, R * 1.15, R * 0.28, 0, 0, TAU);
    ctx.fill();

    // dotted hop-trail left by the pulsar
    this.plTrail.push({ x: pp.x, y: pp.y, r: R * 0.24 });
    if (this.plTrail.length > 14) this.plTrail.shift();
    for (let i = 0; i < this.plTrail.length; i++) {
      const tr = this.plTrail[i];
      const a = (i + 1) / this.plTrail.length;
      ctx.strokeStyle = `rgba(0,0,0,${(0.32 * a).toFixed(2)})`;
      ctx.lineWidth = 1.6;
      roughCircle(ctx, tr.x, tr.y, tr.r * a, 503 + i * 7, 0.5, 6);
    }

    // the star bounces gently in place
    const by = Math.sin(t * 2.6) * R * 0.05;

    /* --- star body: slow happy spin, same two sloppy strokes as the hero --- */
    ctx.save();
    ctx.translate(L.cx, L.cy + by);
    ctx.rotate(t * 0.5);
    ctx.scale(s, s);
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
    ctx.restore();

    /* --- her happy face: eyes watch the pulsar --- */
    const dX = pp.x - L.cx, dY = pp.y - (L.cy + by);
    const d = Math.hypot(dX, dY) || 1;
    const lx = dX / d, ly = dY / d;
    const near = d < R * 0.72;            // the pulsar is close enough to pet

    ctx.save();
    ctx.translate(L.cx, L.cy + by);

    const er = 5.1 * s;
    for (const dir of [-1, 1]) {
      const ex = dir * 5.7 * s + wob(41 + dir * 9, 0.5 * s);
      const ey = -3.4 * s + wob(41 + dir * 4, 0.5 * s);
      if (near && this.blink <= 0) {
        // joyful squint — a thick arch
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3.2 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - er * 1.1, ey + er * 0.3);
        ctx.quadraticCurveTo(ex, ey - er * 0.85 + wob(41 + dir * 13, 0.6 * s), ex + er * 1.1, ey + er * 0.3);
        ctx.stroke();
      } else {
        roughEllipsePath(ctx, ex, ey, er, er * 1.16, 41 + dir * 17, 0.08, 12);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.2 * s;
        ctx.stroke();

        if (this.blink > 0) {
          ctx.beginPath();
          ctx.moveTo(ex - er * 1.1, ey + 0.5);
          ctx.lineTo(ex + er * 1.1, ey + 0.5);
          ctx.lineWidth = 2.6 * s;
          ctx.stroke();
        } else {
          const px = clamp(lx * er * 0.5, -er * 0.5, er * 0.5);
          const py = clamp(ly * er * 0.5, -er * 0.55, er * 0.5);
          ctx.beginPath();
          ctx.arc(ex + px, ey + py, 2.8 * s, 0, TAU);
          ctx.fillStyle = '#000';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(ex + px - 1.1 * s, ey + py - 1.3 * s, 1.05 * s, 0, TAU);
          ctx.fillStyle = '#fff';
          ctx.fill();
        }
      }
    }

    // smile — she grins wider whenever the pulsar hops close
    const smileY = near ? 8.8 * s : 7.3 * s;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4.6 * s, 3 * s);
    ctx.quadraticCurveTo(0, smileY + wob(72, 1.2 * s), 4.6 * s, 3 * s);
    ctx.stroke();

    // faint cheek strokes
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.8 * s;
    for (const dir of [-1, 1]) {
      roughEllipsePath(ctx, dir * 6.8 * s, 2.4 * s, 1.6 * s, 1.1 * s, 41 + dir * 44, 0.2, 8);
      ctx.stroke();
    }
    ctx.restore();

    /* --- the small pulsar she plays with --- */
    this.drawMiniPulsar(ctx, pp.x, pp.y, R * 0.13);
  }

  /** tiny gleeful pulsar — the star's plaything */
  drawMiniPulsar(ctx, x, y, pr) {
    const pseed = 61;
    ctx.save();
    ctx.translate(x, y);

    // fluttering corona nubs
    ctx.rotate(this.t * 2.3);
    ctx.strokeStyle = 'rgba(0,0,0,0.42)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4;
      const r1 = pr + 2, r2 = pr + 5 + Math.sin(this.t * 11 + i * 2) * 2;
      roughLine(ctx, Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r2, Math.sin(a) * r2, pseed + i * 13, 2);
    }
    ctx.rotate(-this.t * 2.3);

    // black core
    roughCirclePath(ctx, 0, 0, pr, pseed + 5, 0.12, 12);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // white void eyes, the way the released pulsar gleams
    const er = pr * 0.3;
    for (const sdir of [-1, 1]) {
      roughEllipsePath(ctx, sdir * pr * 0.33, -pr * 0.08 + wob(pseed + sdir * 4, pr * 0.04),
        er * 0.8, er, pseed + sdir * 17, 0.12, 8);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    // tiny white grin
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-pr * 0.3, pr * 0.28);
    ctx.quadraticCurveTo(0, pr * 0.54 + wob(pseed + 31, pr * 0.05), pr * 0.3, pr * 0.28);
    ctx.stroke();

    // occasional sparkles
    if (chance(0.04)) {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 4; i++) {
        const a = rnd(TAU);
        const rr = pr * rnd(0.5, 1.4);
        roughLine(ctx, Math.cos(a) * rr, Math.sin(a) * rr,
          Math.cos(a) * (rr + rnd(4, 9)), Math.sin(a) * (rr + rnd(4, 9)), rnd(1000) | 0, 2);
      }
    }
    ctx.restore();
  }
}