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

/* ============================================================
   J1407Background — phase 3 (BROKEN MEMORIES). The sheet drifts
   past super-Saturn J1407b: a huge gas giant whose colossal ring
   system slowly spins (dashes crawl, debris dots orbit). Keeps
   the space dressing of CosmicBackground — stars behind the
   planet, meteors and comets in front of it.
   ============================================================ */

class J1407Background extends CosmicBackground {
  constructor(game) {
    super(game);
    this.spin = rnd(0, TAU);                 // ring rotation phase
    this.orb = [rnd(TAU), rnd(TAU) + 2, rnd(TAU) + 4]; // debris on the rings
  }

  update(dt) {
    super.update(dt);
    this.spin += dt * 0.22;
    for (let i = 0; i < this.orb.length; i++) this.orb[i] += dt * (0.4 - i * 0.1);
  }

  /** the giant hanging low on the right — fully inside the frame */
  geom() {
    const w = this.game.w, h = this.game.h;
    const R = Math.min(w, h) * 0.3;
    return {
      cx: w * 0.76, cy: h * 0.58, R,
      tilt: -0.34,                 // ring plane tilt
      rx: R * 2.35, ry: R * 0.62   // ring half-extents
    };
  }

  /** ring bands: half arcs, either behind (front=false) or
      in front of the planet — so the sphere sits inside them */
  drawRings(ctx, g, front) {
    const fs = [0.5, 0.62, 0.74, 0.86, 0.98, 1.12];
    const alphas = [0.55, 0.26, 0.66, 0.36, 0.48, 0.2];
    const lws = [4, 8, 2.5, 10, 3, 6];
    const dashes = [[16, 9], [], [7, 12], [], [20, 14], [5, 9]];
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i];
      ctx.strokeStyle = `rgba(0,0,0,${alphas[i]})`;
      ctx.lineWidth = lws[i];
      ctx.setLineDash(dashes[i]);
      // the dashes crawl around — the rings visibly rotate
      ctx.lineDashOffset = (front ? -1 : 1) * this.spin * (30 + i * 9);
      ctx.beginPath();
      ctx.ellipse(g.cx, g.cy, g.rx * f, g.ry * f, g.tilt,
        front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // debris dots orbiting along the rings
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    for (let i = 0; i < this.orb.length; i++) {
      const f = fs[1 + i];
      const a = this.orb[i];
      const ex = Math.cos(a) * g.rx * f, ey = Math.sin(a) * g.ry * f;
      const rx = ex * Math.cos(g.tilt) - ey * Math.sin(g.tilt);
      const ry = ex * Math.sin(g.tilt) + ey * Math.cos(g.tilt);
      const frontSide = Math.sin(a) > 0;
      if (frontSide !== front) continue;
      ctx.beginPath();
      ctx.arc(g.cx + rx, g.cy + ry, 3 + i, 0, TAU);
      ctx.fill();
    }
  }

  drawBody(ctx, g) {
    const { cx, cy, R } = g;
    // the paper ball itself
    roughCirclePath(ctx, cx, cy, R, 401, 0.05, 40);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.lineWidth = 5;
    ctx.stroke();

    // gas bands: hand-hatched stripes clipped to the disc
    ctx.save();
    roughCirclePath(ctx, cx, cy, R, 401, 0.05, 40);
    ctx.clip();
    const bands = [[-0.64, 0.1], [-0.32, 0.16], [0.04, 0.13], [0.38, 0.2], [0.7, 0.1]];
    for (let i = 0; i < bands.length; i++) {
      hatchRect(ctx, cx - R, cy + bands[i][0] * R, R * 2, bands[i][1] * R, 7, 411 + i * 13, {
        angle: 0.35 + i * 0.12, color: 'rgba(0,0,0,0.5)', width: 2, amp: 1.6
      });
    }
    // the great storm swirling in the atmosphere
    roughCirclePath(ctx, cx - R * 0.35, cy + R * 0.22, R * 0.13, 431, 0.2, 12);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
    roughCirclePath(ctx, cx - R * 0.35, cy + R * 0.22, R * 0.06, 437, 0.25, 8);
    ctx.stroke();
    ctx.restore();
  }

  draw(ctx) {
    ctx.lineJoin = 'round';
    // far stars hide behind the planet
    for (const st of this.stars) this.drawStar(ctx, st);
    const g = this.geom();
    this.drawRings(ctx, g, false);
    this.drawBody(ctx, g);
    this.drawRings(ctx, g, true);
    // near passers-by fly in front of it
    for (const m of this.meteors) this.drawMeteor(ctx, m);
    for (const c of this.comets) this.drawComet(ctx, c);
  }
}