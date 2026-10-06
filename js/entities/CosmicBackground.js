'use strict';

/* ============================================================
   CosmicBackground — spawned after the star RELEASES (90s+).
   • little hero stars twinkle (4x smaller than the player),
   • meteorites streak across the sheet,
   • rare comets scar the sky with long tails.
   Purely decorative — the whole sheet is inverted at this point,
   so the ink below gleams white on black.
   ============================================================ */

class CosmicBackground {
  constructor(game) {
    this.game = game;
    this.stars = [];
    this.meteors = [];
    this.comets = [];
    this.cometT = rnd(1.5, 3.5);

    for (let i = 0; i < 42; i++) this.stars.push(this.makeStar());
    for (let i = 0; i < 3; i++) this.meteors.push(this.makeMeteor());
  }

  makeStar() {
    const w = this.game.w, h = this.game.h;
    return {
      x: rnd(0, w), y: rnd(0, h),
      s: rnd(2.6, 3.9),          // 4x smaller than the 16px hero star
      seed: rnd(1000),
      ph: rnd(TAU),
      tw: rnd(0.4, 1.2),
      vx: rnd(-7, 7),
      vy: rnd(-16, -5)
    };
  }

  makeMeteor() {
    const w = this.game.w, h = this.game.h;
    const top = chance(0.55);
    const x = top ? rnd(0, w) : (chance(0.5) ? -50 : w + 50);
    const y = top ? -50 : rnd(0, h * 0.7);
    const dir = x < w / 2 ? 1 : -1;
    const a = rnd(0.5, 1.05);
    const sp = rnd(150, 240);
    return {
      x, y,
      vx: Math.cos(a) * sp * dir,
      vy: Math.sin(a) * sp,
      len: rnd(30, 58),
      life: rnd(1.8, 3), maxLife: 3,
      seed: rnd(1000)
    };
  }

  makeComet() {
    const w = this.game.w, h = this.game.h;
    const fromLeft = chance(0.5);
    const x = fromLeft ? -80 : w + 80;
    const y = rnd(0.08, 0.7) * h;
    const a = fromLeft ? rnd(0.35, 0.7) : Math.PI - rnd(0.35, 0.7);
    const sp = rnd(260, 380);
    return {
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 2.6, maxLife: 2.6,
      seed: rnd(1000)
    };
  }

  update(dt) {
    const w = this.game.w, h = this.game.h;

    for (const st of this.stars) {
      st.x += st.vx * dt;
      st.y += st.vy * dt;
      if (st.x < -10) st.x = w + 10; else if (st.x > w + 10) st.x = -10;
      if (st.y < -10) st.y = h + 10; else if (st.y > h + 10) st.y = -10;
    }

    for (let i = 0; i < this.meteors.length; i++) {
      const m = this.meteors[i];
      m.life -= dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.life <= 0 || m.x < -90 || m.x > w + 90 || m.y < -90 || m.y > h + 90) {
        this.meteors[i] = this.makeMeteor();
      }
    }

    if (this.comets.length < 2) {
      this.cometT -= dt;
      if (this.cometT <= 0) {
        this.cometT = rnd(2.5, 5);
        this.comets.push(this.makeComet());
      }
    }
    for (let i = this.comets.length - 1; i >= 0; i--) {
      const c = this.comets[i];
      c.life -= dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.life <= 0 || c.x < -140 || c.x > w + 140 || c.y < -140 || c.y > h + 140) {
        this.comets.splice(i, 1);
      }
    }
  }

  drawStar(ctx, st) {
    const a = 0.45 + 0.5 * Math.sin(CLOCK.time * st.tw + st.ph);
    if (a < 0.14) return;
    ctx.save();
    ctx.globalAlpha = a.toFixed(3);
    ctx.translate(st.x, st.y);
    const R = st.s;
    starPath(ctx, R, R * 0.45, st.seed, 0.9);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // tiny gleeful face (the hero's, quarter size)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-R * 0.3, -R * 0.12, R * 0.17, 0, TAU);
    ctx.arc(R * 0.3, -R * 0.12, R * 0.17, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, R * 0.3, R * 0.13, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawMeteor(ctx, m) {
    const k = clamp(m.life / m.maxLife, 0, 1);
    const sp = Math.hypot(m.vx, m.vy) || 1;
    const nx = m.vx / sp, ny = m.vy / sp;
    const px = -ny, py = nx;
    const tx = m.x - nx * m.len, ty = m.y - ny * m.len;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = (0.3 + 0.6 * k).toFixed(3);

    // main streak
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2.2;
    roughLine(ctx, tx, ty, m.x, m.y, m.seed, 2.6);

    // side sparks along the tail
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const s0 = tx + nx * (i + 1) * 10;
      const s1 = ty + ny * (i + 1) * 10;
      const off = (i + 1) * 2.6;
      roughLine(ctx, s0 + px * off, s1 + py * off, s0 - px * off, s1 - py * off, m.seed + i * 7, 1.8);
    }

    // burning head
    roughCirclePath(ctx, m.x, m.y, 3, m.seed + 3, 0.2, 6);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
  }

  drawComet(ctx, c) {
    const k = clamp(c.life / c.maxLife, 0, 1);
    const sp = Math.hypot(c.vx, c.vy) || 1;
    const nx = c.vx / sp, ny = c.vy / sp;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = (0.5 + 0.5 * k).toFixed(3);

    // long tapering tail (three segments)
    const segs = 6;
    const tail = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const d = t * 150;
      const wobX = Math.sin(t * 5 + c.seed) * t * 14;
      tail.push({ x: c.x - nx * d + -ny * wobX, y: c.y - ny * d + nx * wobX });
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 6 * k;
    roughPath(ctx, tail, c.seed, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 12 * k;
    roughPath(ctx, tail, c.seed + 5, 4);

    // nucleus
    roughCirclePath(ctx, c.x, c.y, 4.6, c.seed + 9, 0.14, 8);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  draw(ctx) {
    ctx.lineJoin = 'round';
    for (const st of this.stars) this.drawStar(ctx, st);
    for (const m of this.meteors) this.drawMeteor(ctx, m);
    for (const c of this.comets) this.drawComet(ctx, c);
  }
}