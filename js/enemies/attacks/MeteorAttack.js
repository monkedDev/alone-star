'use strict';

/* ============================================================
   23. METEOR — a fat ink rock screams down onto a telegraph-
   crossed landing spot. On impact: a shockwave ring of drops,
   sparked chunks, and a smouldering crater that stays hot for a
   blink.
   ============================================================ */

class MeteorAttack extends Enemy {
  static type = 'meteor';
  static family = 'bullet';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    this.fx = rnd(0.16, 0.84) * w;
    this.fy = h * rnd(0.3, 0.86);
    this.R = rnd(28, 38);
    this.fall = Math.max(1.0, 1.55 - (this.diff - 1) * 0.07);
    this.x0 = this.fx - rnd(140, 280) * (chance(0.5) ? 1 : -1);
    this.y0 = -rnd(40, 90);
    this.x = this.x0;
    this.y = this.y0;
    this.hit = false;      // landed
    this.craterT = 0;
    this.label = 'METEOR';
  }

  update(dt) {
    super.update(dt);
    if (this.hit) {
      this.craterT += dt;
      if (CLOCK.frame % 3 === 0) {
        this.game.bullets.spawnParticle({
          x: this.x + rnd(-8, 8), y: this.y + rnd(-5, 3),
          vx: rnd(-12, 12), vy: rnd(-70, -34),
          life: 0.7, size: rnd(2, 4.5), g: rint(40, 110), drag: 1.2
        });
      }
      if (this.craterT >= 1.7) this.finish();
      return;
    }

    const k = this.age / this.fall;
    if (k >= 1) {
      this.x = this.fx;
      this.y = this.fy;
      this.impact();
    } else {
      const kk = k * k * (3 - 2 * k);
      this.x = lerp(this.x0, this.fx, kk);
      this.y = lerp(this.y0, this.fy, kk);
    }

    // flame trail behind the rock
    if (CLOCK.frame % 2 === 0) {
      const dx = this.fx - this.x0, dy = this.fy - this.y0;
      const d = Math.hypot(dx, dy) || 1;
      this.game.bullets.spawnParticle({
        x: this.x - dx / d * 16, y: this.y - dy / d * 16,
        vx: rnd(-24, 24), vy: rnd(-24, 24),
        life: 0.5, size: rnd(2, 4.5), g: rint(60, 160), drag: 2
      });
    }
  }

  impact() {
    this.hit = true;
    const g = this.game;
    this.fireFlash(10);
    g.renderer.addShake(16);

    // grey shock burst
    g.bullets.burst(this.x, this.y, 24, { s0: 120, s1: 480, life: 0.9, size: 5, g: rint(60, 160) });
    // expanding ring of droplets
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16;
      const sp = rnd(240, 340) + this.diff * 22;
      g.bullets.spawnBullet({
        x: this.x, y: this.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rnd(4, 6.5), style: 'blob', behavior: 'straight',
        ax: -Math.cos(a) * 60, ay: -Math.sin(a) * 60, maxLife: 4
      });
    }
    // bouncing chunks
    for (let i = 0; i < 6; i++) {
      const a = rnd(-2.9, -0.2);
      const sp = rnd(180, 420);
      g.bullets.spawnBullet({
        x: this.x, y: this.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rnd(6, 12), style: 'shard', behavior: 'bounce',
        spin: rnd(-5, 5), maxLife: 3
      });
    }
    // direct crush on the star
    if (dist(this.x, this.y, g.player.x, g.player.y) < this.R + 22) g.player.hit();
  }

  draw(ctx) {
    const seed = this.seed;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (!this.hit) {
      // dashed fall path + doomed landing crosshair
      const dx = this.fx - this.x0, dy = this.fy - this.y0;
      const d = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      roughLine(ctx, this.x - dx / d * 26, this.y - dy / d * 26, this.fx, this.fy, seed + 5, 2);
      ctx.setLineDash([]);
      const blink = 0.55 + 0.45 * Math.sin(CLOCK.time * 9);
      ctx.strokeStyle = `rgba(0,0,0,${blink.toFixed(2)})`;
      ctx.lineWidth = 2.6;
      roughLine(ctx, this.fx - 14, this.fy, this.fx + 14, this.fy, seed + 9, 1.6);
      roughLine(ctx, this.fx, this.fy - 14, this.fx, this.fy + 14, seed + 13, 1.6);

      // flickering flame coat
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 5; i++) {
        const a = seed + i * 91 + CLOCK.tick9 * 7;
        const r1 = this.R * 1.15, r2 = this.R * 2.3;
        roughLine(ctx, this.x + Math.cos(a) * r1, this.y + Math.sin(a) * r1,
          this.x + Math.cos(a) * r2, this.y + Math.sin(a) * r2, seed + 15 + i * 9, 2);
      }

      // the rock: jagged grey lump with scorch cracks
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU;
        const rr = this.R + wob(seed + i * 13, this.R * 0.22);
        const px = this.x + Math.cos(a) * rr, py = this.y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(232,232,232,0.92)';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3.2;
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      roughLine(ctx, this.x - this.R * 0.5, this.y - this.R * 0.4, this.x + this.R * 0.2, this.y - this.R * 0.1, seed + 43, 1.6);
      roughLine(ctx, this.x + this.R * 0.2, this.y - this.R * 0.1, this.x - this.R * 0.1, this.y + this.R * 0.5, seed + 47, 1.6);
    } else {
      // smouldering crater
      const hot = this.craterT < 0.6 ? 1 : Math.max(0, 1 - (this.craterT - 0.6) / 1.1);
      roughEllipsePath(ctx, this.x, this.y + 6, this.R * 1.3, this.R * 0.55, seed + 21, 0.28, 14);
      ctx.globalAlpha = 0.85 * hot;
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(0,0,0,${(0.9 * hot).toFixed(2)})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6 + 0.2;
        roughLine(ctx, this.x + Math.cos(a) * this.R * 1.3, this.y + 6 + Math.sin(a) * this.R * 0.55,
          this.x + Math.cos(a) * this.R * 1.7, this.y + 6 + Math.sin(a) * this.R * 0.8, seed + 31 + i * 7, 2);
      }
    }

    ctx.restore();
  }

  hitTest(x, y) {
    if (this.hit) {
      return this.craterT < 0.55 && dist(x, y, this.x, this.y) < this.R * 1.25;
    }
    if (this.age < 0.2) return false;
    return dist(x, y, this.x, this.y) < this.R;
  }
}