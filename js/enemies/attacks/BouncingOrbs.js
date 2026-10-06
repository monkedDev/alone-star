'use strict';

/* ============================================================
   20. BOUNCING ORBS — heavy ink balls ricochet off the sheet
   edges for a long time, turning the screen into pinball.
   ============================================================ */

class BouncingOrbsAttack extends Enemy {
  static type = 'bouncers';
  static family = 'bullet';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    const count = Math.max(2, params.count || 6);
    this.life = Math.max(6, 8.5 - (this.diff - 1) * 0.25);
    this.label = 'BOUNCING ORBS';

    for (let i = 0; i < count; i++) {
      const a = rnd(TAU);
      const sp = rnd(180, 300) + this.diff * 25;
      this.game.bullets.spawnBullet({
        x: rnd(0.2, 0.8) * w,
        y: rnd(0.2, 0.8) * h,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: rnd(9, 14),
        style: 'orb',
        behavior: 'bounce',
        trail: 0,
        maxLife: this.life + 1.5
      });
    }
    this.game.renderer.addShake(4);
  }

  update(dt) {
    super.update(dt);
    if (CLOCK.frame % 6 === 0) {
      // faint grey ping marks where balls recently bounced are
      // handled by the streak in the bullet draw itself
    }
    if (this.age >= this.life) this.finish();
  }

  draw(ctx) {
    // frame ticks showing this attack is live
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 3;
    const c = 22;
    const corners = [[16, 16], [this.w - 16, 16], [16, this.h - 16], [this.w - 16, this.h - 16]];
    for (let i = 0; i < 4; i++) {
      const [x, y] = corners[i];
      const dx = i % 2 === 0 ? 1 : -1;
      const dy = i < 2 ? 1 : -1;
      roughLine(ctx, x, y, x + dx * c, y, this.seed + i * 3, 2);
      roughLine(ctx, x, y, x, y + dy * c, this.seed + i * 5, 2);
    }
    ctx.restore();
  }
}
