'use strict';

/* ============================================================
   6. INK BLLOT MINES — fall to a random spot, inflate in
   hard 9-FPS steps and detonate into hundreds of fragments.
   ============================================================ */

class InkMineAttack extends Enemy {
  static type = 'mine';
  static family = 'bullet';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    const count = Math.max(1, params.count || 1);
    this.mines = [];
    for (let i = 0; i < count; i++) {
      this.mines.push({
        x: rnd(60, w - 60),
        y: -50 - rnd(0, 160),
        ty: rnd(0.16, 0.86) * h,
        // buff: falls much faster
        vy: rnd(430, 720),
        state: 'fall',
        step: 0,
        stepT: 0,
        r: rnd(10, 16),
        seed: rnd(1000),
        // buff: shorter fuse
        fuse: rnd(0.18, 0.42)
      });
    }
    this.label = 'INK MINES';
  }

  explode(m) {
    // buff: 175 shards, faster and wider spread
    const n = 175;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(-0.03, 0.03);
      const sp = rnd(190, 580);
      this.game.bullets.spawnBullet({
        x: m.x, y: m.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.85,
        r: rnd(2, 5),
        style: 'shard',
        behavior: 'shard',
        spin: rnd(-9, 9),
        maxLife: 2.6
      });
    }
    this.game.bullets.burst(m.x, m.y, 60, { s0: 80, s1: 560, life: 1.1, size: 6, g: rint(50, 170), drag: 2.4 });
    this.game.renderer.addShake(13);
    this.game.renderer.addFlash(0.18);
    m.state = 'done';
  }

  update(dt) {
    super.update(dt);
    let alive = 0;

    for (const m of this.mines) {
      if (m.state === 'done') continue;
      alive++;

      if (m.state === 'fall') {
        m.vy += 750 * dt;   // buff: faster acceleration
        m.y += m.vy * dt;
        if (m.y >= m.ty) {
          m.y = m.ty;
          m.state = 'inflate';
          m.stepT = m.fuse;
          this.game.renderer.addShake(3);
        }
      } else if (m.state === 'inflate') {
        m.stepT -= dt;
        if (m.stepT <= 0) {
          // one discrete 9-FPS inflation step
          m.stepT += 1 / 9;
          m.step++;
          m.r += rnd(8, 13);   // buff: grows bigger per 9-FPS step
          this.game.bullets.spawnParticle({
            x: m.x + rnd(-m.r, m.r), y: m.y + rnd(-m.r, m.r),
            vx: rnd(-40, 40), vy: rnd(-60, 20),
            life: 0.5, size: rnd(2, 5), g: rint(110, 190), drag: 3
          });
          if (m.step >= 7) this.explode(m);
        }
      }
    }

    if (alive === 0) this.finish();
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    for (const m of this.mines) {
      if (m.state === 'done') continue;

      if (m.state === 'fall') {
        roughCirclePath(ctx, m.x, m.y, m.r, m.seed, 0.3, 12);
        ctx.fillStyle = '#000';
        ctx.fill();
        // motion drip
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 3;
        roughLine(ctx, m.x, m.y - m.r, m.x + wob(m.seed, 5), m.y - m.r - 26, m.seed + 5, 3);
        // target mark below
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        const ty = m.ty;
        roughLine(ctx, m.x - 22, ty, m.x + 22, ty, m.seed + 9, 2);
        continue;
      }

      // inflating jagged blot
      const pulse = 1 + (m.step % 2) * 0.06;
      const r = m.r * pulse;

      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 8;
      roughCircle(ctx, m.x, m.y, r * 1.35, m.seed + 31, 0.2, 20);

      roughCirclePath(ctx, m.x, m.y, r, m.seed + m.step * 3, 0.24, 24);
      ctx.fillStyle = '#000';
      ctx.fill();

      // white screaming scribble
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 4; i++) {
        const a = i * TAU / 4 + m.step * 0.4;
        roughLine(ctx,
          m.x + Math.cos(a) * r * 0.7, m.y + Math.sin(a) * r * 0.7,
          m.x - Math.cos(a) * r * 0.3, m.y - Math.sin(a) * r * 0.3,
          m.seed + i * 13 + wseed(), 3.5);
      }

      // fuse ticks
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 2;
      for (let i = 0; i < m.step; i++) {
        const a = i * TAU / 7 - Math.PI / 2;
        roughLine(ctx,
          m.x + Math.cos(a) * (r + 8), m.y + Math.sin(a) * (r + 8),
          m.x + Math.cos(a) * (r + 16), m.y + Math.sin(a) * (r + 16),
          m.seed + i * 7, 1.4);
      }
    }
  }

  hitTest(x, y) {
    for (const m of this.mines) {
      if (m.state === 'inflate' && dist(x, y, m.x, m.y) < m.r * 0.95) return true;
    }
    return false;
  }
}
