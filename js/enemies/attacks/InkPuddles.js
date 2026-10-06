'use strict';

/* ============================================================
   16. INK PUDDLES — irregular black puddles grow in 9-FPS
   steps, sit on the sheet and spit arcing drops upward.
   ============================================================ */

class InkPuddlesAttack extends Enemy {
  static type = 'puddles';
  static family = 'field';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    const count = Math.max(1, params.count || 2);
    this.puddles = [];
    for (let i = 0; i < count; i++) {
      this.puddles.push({
        x: rnd(0.12, 0.88) * w,
        y: rnd(0.2, 0.9) * h,
        maxR: rnd(55, 92),
        r: 0,
        step: 0,
        stepT: rnd(0, 0.11),
        state: 'grow',     // grow -> hold -> shrink
        hold: rnd(2.4, 3.6),
        spitT: rnd(0.5, 1.2),
        seed: rnd(1000)
      });
    }
    this.label = 'INK PUDDLES';
  }

  update(dt) {
    super.update(dt);
    let alive = 0;

    for (const p of this.puddles) {
      if (p.state === 'dead') continue;
      alive++;

      if (p.state === 'grow' || p.state === 'shrink') {
        p.stepT -= dt;
        if (p.stepT <= 0) {
          p.stepT += 1 / 9;
          if (p.state === 'grow') {
            p.step = Math.min(6, p.step + 1);
            p.r = p.maxR * p.step / 6;
            if (p.step >= 6) p.state = 'hold';
          } else {
            p.step = Math.max(0, p.step - 1);
            p.r = p.maxR * p.step / 6;
            if (p.step <= 0) p.state = 'dead';
          }
        }
      } else if (p.state === 'hold') {
        p.hold -= dt;
        p.spitT -= dt;
        if (p.spitT <= 0) {
          p.spitT = rnd(0.85, 1.35);
          // arcing drop, gravity brings it back down
          this.game.bullets.spawnBullet({
            x: p.x + rnd(-p.r * 0.5, p.r * 0.5),
            y: p.y - p.r * 0.4,
            vx: rnd(-90, 90),
            vy: rnd(-520, -330),
            ax: 0, ay: 780,
            r: rnd(7, 12),
            style: 'drop',
            behavior: 'straight',
            trail: 1
          });
        }
        if (p.hold <= 0) p.state = 'shrink';
      }
    }

    if (alive === 0) this.finish();
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    for (const p of this.puddles) {
      if (p.state === 'dead' || p.r < 2) continue;
      const grow = p.state === 'grow';

      // grey damp stain
      ctx.strokeStyle = 'rgba(0,0,0,0.09)';
      ctx.lineWidth = 14;
      roughCircle(ctx, p.x, p.y, p.r * 1.12, p.seed + 1, 0.2, 20);

      // the blot itself
      roughCirclePath(ctx, p.x, p.y, p.r, p.seed, 0.22, 26);
      ctx.fillStyle = '#000';
      ctx.fill();

      // little satellite blots
      for (let i = 0; i < 3; i++) {
        const a = i * TAU / 3 + p.seed;
        roughCirclePath(ctx,
          p.x + Math.cos(a) * p.r * 1.05, p.y + Math.sin(a) * p.r * 0.95,
          p.r * 0.16, p.seed + i * 7, 0.3, 8);
        ctx.fill();
      }

      // white scratches inside
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        roughLine(ctx,
          p.x - p.r * 0.6 + i * p.r * 0.4, p.y - p.r * 0.35,
          p.x - p.r * 0.3 + i * p.r * 0.4, p.y + p.r * 0.4,
          p.seed + i * 11 + wseed(), 4);
      }

      if (grow) {
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 7]);
        roughCircle(ctx, p.x, p.y, p.maxR, p.seed + 5, 0.05, 26);
        ctx.setLineDash([]);
      }
    }
  }

  hitTest(x, y) {
    for (const p of this.puddles) {
      if (p.state === 'dead' || p.state === 'shrink') continue;
      if (dist(x, y, p.x, p.y) < p.r * 0.9) return true;
    }
    return false;
  }
}
