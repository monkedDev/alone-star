'use strict';

/* ============================================================
   2. BLACK HOLES — swirling ink spiral that gravitationally
   drags the star toward its deadly core.
   ============================================================ */

class BlackHoleAttack extends Enemy {
  static type = 'hole';
  static family = 'field';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    this.x = rnd(0.15, 0.85) * w;
    this.y = rnd(0.18, 0.82) * h;
    this.R = rnd(58, 82);
    this.pullR = rnd(230, 330);
    this.dir = chance(0.5) ? 1 : -1;
    this.spin = rnd(1.1, 2.1);
    this.grow = 0.55;
    this.life = Math.max(5.5, 8 - (this.diff - 1) * 0.25);
    this.label = 'BLACK HOLE';
  }

  update(dt) {
    super.update(dt);
    const t = this.age;
    const p = this.game.player;

    if (t > this.grow && t < this.life - 0.5 && p.alive) {
      const dx = this.x - p.x, dy = this.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < this.pullR) {
        const f = 1 - d / this.pullR;
        const pull = 760 * f * f + 120 * f;
        const nx = dx / d, ny = dy / d;
        p.fx += nx * pull - ny * pull * 0.75 * this.dir;
        p.fy += ny * pull + nx * pull * 0.75 * this.dir;
      }
      if (d < 15) p.hit();
    }

    // swirl the ink around too
    const bl = this.game.bullets.bullets.used;
    for (let i = 0; i < bl.length; i++) {
      const b = bl[i];
      if (!b.alive) continue;
      const dx = this.x - b.x, dy = this.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < this.pullR * 1.3) {
        const f = 1 - d / (this.pullR * 1.3);
        b.vx += (dx / d * 140 - dy / d * 260 * this.dir) * f * dt;
        b.vy += (dy / d * 140 + dx / d * 260 * this.dir) * f * dt;
      }
    }

    if (t >= this.life) {
      this.sparks(this.x, this.y, 24);
      this.finish();
    }
  }

  draw(ctx) {
    const t = this.age;
    const grow = clamp(t / this.grow, 0.05, 1);
    const fade = clamp((this.life - t) / 0.6, 0, 1);
    const R = this.R * grow;
    const dir = this.dir;
    const spin = CLOCK.time * this.spin * dir;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.lineCap = 'round';

    // grey haze
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 6 + i * 3;
      roughCircle(ctx, this.x, this.y, R * (1.35 + i * 0.42) + wob(this.seed + i, 7), this.seed + i * 9, 0.24, 16);
    }

    // rotating ink spiral arms
    for (let arm = 0; arm < 3; arm++) {
      const pts = [];
      for (let s = 0; s <= 44; s++) {
        const k = s / 44;
        const rr = R * 0.16 + k * R * 2.1;
        const a = arm * TAU / 3 + k * 4.6 * dir + spin;
        pts.push({
          x: this.x + Math.cos(a) * rr + wob(this.seed + arm * 31 + s, 3),
          y: this.y + Math.sin(a) * rr + wob(this.seed + arm * 57 + s, 3)
        });
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 9;
      roughPath(ctx, pts, this.seed + arm * 13, 2.5);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4.2;
      roughPath(ctx, pts, this.seed + arm * 17 + 3, 2.5);
    }

    // solid core
    roughCirclePath(ctx, this.x, this.y, R * 0.34, this.seed + 71, 0.28, 16);
    ctx.fillStyle = '#000';
    ctx.fill();

    // white chaos scribble inside
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a1 = rnd(0, TAU);
      roughLine(
        ctx,
        this.x + Math.cos(a1) * R * 0.2, this.y + Math.sin(a1) * R * 0.2,
        this.x - Math.cos(a1) * R * 0.22, this.y - Math.sin(a1) * R * 0.22,
        this.seed + i * 7 + wseed(), 3
      );
    }

    // gravity pull radius hint
    if (t < this.grow) {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 9]);
      roughCircle(ctx, this.x, this.y, this.pullR * grow, this.seed + 90, 0.03, 40);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  hitTest(x, y) {
    if (this.age < this.grow || this.age > this.life - 0.5) return false;
    return dist(x, y, this.x, this.y) < 15;
  }
}
