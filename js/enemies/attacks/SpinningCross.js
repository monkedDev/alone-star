'use strict';

/* ============================================================
   5. SPINNING CROSS — two intersecting laser lines slowly
   rotate around screen centre, forcing the star to circle.
   ============================================================ */

class SpinningCrossAttack extends Enemy {
  static type = 'cross';
  static family = 'beam';

  init(params) {
    super.init(params);
    this.cx = this.w / 2 + rnd(-60, 60);
    this.cy = this.h / 2 + rnd(-50, 50);
    // NERF: much longer warning
    this.warn = Math.max(1.4, 1.9 - (this.diff - 1) * 0.06);
    // NERF: shorter presence
    this.life = Math.max(4, 6.5 - (this.diff - 1) * 0.25);
    this.a = rnd(TAU);
    // NERF: slower rotation
    this.vel = rnd(0.15, 0.28) * (chance(0.5) ? 1 : -1);
    this.len = Math.hypot(this.w, this.h) * 0.8;
    // NERF: thinner beams
    this.width = rnd(5.5, 8.5);
    this.label = 'SPINNING CROSS';
  }

  update(dt) {
    super.update(dt);
    if (this.age > this.warn) {
      this.a += (this.vel + Math.sin(this.age * 1.7) * 0.07) * dt;
    }
    if (this.age > this.warn + this.life) this.finish();
  }

  draw(ctx) {
    const active = this.age > this.warn;
    ctx.lineCap = 'round';
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(this.a);

    if (!active) {
      const k = clamp(this.age / this.warn, 0, 1);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 13]);
      ctx.rotate(-this.a);
      for (const ra of [0, Math.PI / 2]) {
        ctx.save();
        ctx.rotate(ra);
        ctx.beginPath();
        ctx.moveTo(-this.len, 0);
        ctx.lineTo(this.len * k, 0);
        ctx.stroke();
        ctx.restore();
      }
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }

    for (const ra of [0, Math.PI / 2]) {
      ctx.save();
      ctx.rotate(ra);
      // grey halo
      ctx.strokeStyle = 'rgba(0,0,0,0.13)';
      ctx.lineWidth = this.width * 2.6;
      ctx.beginPath(); ctx.moveTo(-this.len, 0); ctx.lineTo(this.len, 0); ctx.stroke();
      // black beam
      ctx.strokeStyle = '#000';
      ctx.lineWidth = this.width;
      ctx.beginPath(); ctx.moveTo(-this.len, 0); ctx.lineTo(this.len, 0); ctx.stroke();
      // white core
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = this.width * 0.22;
      ctx.beginPath(); ctx.moveTo(-this.len, 0); ctx.lineTo(this.len, 0); ctx.stroke();
      // rotation ticks
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 2.5;
      for (let i = -6; i <= 6; i++) {
        if (i === 0) continue;
        roughLine(ctx, i * 90, -this.width, i * 90, -this.width - 12, this.seed + i, 1.6);
      }
      ctx.restore();
    }
    ctx.restore();

    // pivot knot
    const px = this.cx + wob(this.seed, 4), py = this.cy + wob(this.seed + 3, 4);
    roughCirclePath(ctx, px, py, 16, this.seed + 77, 0.3, 12);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.lineWidth = 2;
    roughLine(ctx, px - 8, py, px + 8, py, this.seed + 9, 1.6);
    roughLine(ctx, px, py - 8, px, py + 8, this.seed + 11, 1.6);
  }

  hitTest(x, y) {
    if (this.age <= this.warn) return false;
    const L = this.len;
    const ca = Math.cos(this.a), sa = Math.sin(this.a);
    // line 1: along angle a ; line 2: perpendicular
    const d1 = pointSegDist(x, y,
      this.cx - ca * L, this.cy - sa * L,
      this.cx + ca * L, this.cy + sa * L);
    const d2 = pointSegDist(x, y,
      this.cx + sa * L, this.cy - ca * L,
      this.cx - sa * L, this.cy + ca * L);
    return Math.min(d1, d2) < this.width * 0.5;
  }
}
