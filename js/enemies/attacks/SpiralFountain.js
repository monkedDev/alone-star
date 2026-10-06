'use strict';

/* ============================================================
   12. SPIRAL FOUNTAIN — a rotating doodle emitter sprays
   classic bullet-hell spirals of ink blobs across the sheet.
   ============================================================ */

class SpiralFountainAttack extends Enemy {
  static type = 'spiral';
  static family = 'bullet';

  init(params) {
    super.init(params);
    this.x = rnd(0.22, 0.78) * this.w;
    this.y = rnd(0.22, 0.78) * this.h;
    this.warn = 0.8;
    this.life = 7.5;
    this.a = rnd(TAU);
    this.emitT = 0;
    this.interval = Math.max(0.07, 0.11 - (this.diff - 1) * 0.008);
    this.speed = 200 + this.diff * 22;
    // variant: 0 = twin spiral, 1 = triple, 2 = tight quadral
    const v = params.variant | 0;
    this.arms = v === 2 ? 4 : (v === 1 ? 3 : 2);
    if (v === 2) this.interval *= 1.18;   // keep bullet budget sane
    this.label = 'SPIRAL FOUNTAIN';
  }

  update(dt) {
    super.update(dt);
    const active = this.age > this.warn && this.age < this.life;

    if (active) {
      this.a += dt * 2.4;
      this.emitT -= dt;
      while (this.emitT <= 0) {
        this.emitT += this.interval;
        for (let k = 0; k < this.arms; k++) {
          const a = this.a + k * TAU / this.arms;
          this.game.bullets.spawnBullet({
            x: this.x, y: this.y,
            vx: Math.cos(a) * this.speed,
            vy: Math.sin(a) * this.speed,
            r: rnd(4.5, 6.5),
            style: 'blob',
            behavior: 'straight'
          });
        }
      }
      if (CLOCK.frame % 3 === 0) {
        this.game.bullets.spawnParticle({
          x: this.x + rnd(-10, 10), y: this.y + rnd(-10, 10),
          vx: rnd(-40, 40), vy: rnd(-40, 40),
          life: 0.4, size: rnd(2, 4.5), g: rint(110, 185), drag: 3
        });
      }
    }

    if (this.age >= this.life) this.finish();
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    const active = this.age > this.warn;
    const seed = this.seed;

    if (!active) {
      // charging circle
      const k = clamp(this.age / this.warn, 0, 1);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 9]);
      roughCircle(ctx, this.x, this.y, 60 * (1.4 - k * 0.4), seed, 0.1, 24);
      ctx.setLineDash([]);
      return;
    }

    // grey halo
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 12;
    roughCircle(ctx, this.x, this.y, 34, seed + 1, 0.2, 18);

    // rotating spray ticks
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = 3;
    for (let i = 0; i < this.arms * 3; i++) {
      const a = this.a + i * TAU / (this.arms * 3);
      roughLine(ctx,
        this.x + Math.cos(a) * 22, this.y + Math.sin(a) * 22,
        this.x + Math.cos(a) * 40, this.y + Math.sin(a) * 40,
        seed + i * 7, 2);
    }

    // the knot itself
    roughCirclePath(ctx, this.x, this.y, 20, seed + 5, 0.24, 14);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.4;
    roughLine(ctx, this.x - 9, this.y - 4, this.x + 8, this.y + 5, seed + 9 + wseed(), 3);
    roughLine(ctx, this.x - 6, this.y + 8, this.x + 7, this.y - 7, seed + 13 + wseed(), 3);
  }

  hitTest(x, y) {
    if (this.age <= this.warn) return false;
    return dist(x, y, this.x, this.y) < 20;
  }
}
