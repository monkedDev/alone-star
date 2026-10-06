'use strict';

/* ============================================================
   22. CLOCKWORK — a giant doodle wall clock ticks away in the
   corner. Each time a hand sweeps past a quarter it STRIKES,
   hosing a fan of ink down the hand's line.
   ============================================================ */

class ClockAttack extends Enemy {
  static type = 'clock';
  static family = 'field';

  init(params) {
    super.init(params);
    this.x = rnd(0.15, 0.85) * this.w;
    this.y = rnd(0.16, 0.64) * this.h;
    this.R = rnd(52, 74);
    this.dir = chance(0.5) ? 1 : -1;
    this.life = Math.max(7, 10.5 - (this.diff - 1) * 0.3);
    this.handA = rnd(TAU);            // fast strike hand
    this.handB = rnd(TAU);            // slow lazy hand
    this.sectorA = this.sectorOf(this.handA);
    this.sectorB = this.sectorOf(this.handB);
    this.label = 'CLOCKWORK';
  }

  sectorOf(a) { return Math.floor((((a % TAU) + TAU) % TAU) / (TAU / 4)); }

  update(dt) {
    super.update(dt);
    this.handA += this.dir * dt * 1.3;
    this.handB += this.dir * dt * 0.52;
    const sa = this.sectorOf(this.handA), sb = this.sectorOf(this.handB);
    if (sa !== this.sectorA) { this.sectorA = sa; this.strike(this.handA, 6); }
    if (sb !== this.sectorB) { this.sectorB = sb; this.strike(this.handB, 3); }
    if (this.age >= this.life) this.finish();
  }

  strike(baseA, n) {
    this.game.renderer.addShake(1.2);
    const edge = this.R + 8;
    const mx = this.x + Math.cos(baseA) * edge;
    const my = this.y + Math.sin(baseA) * edge;
    for (let i = 0; i < n; i++) {
      const a = baseA + (i - (n - 1) / 2) * 0.22;
      const sp = rnd(230, 310) + this.diff * 18;
      this.game.bullets.spawnBullet({
        x: mx, y: my,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rnd(4.5, 7.5), style: 'blob', behavior: 'straight', maxLife: 8
      });
    }
  }

  draw(ctx) {
    const seed = this.seed;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // faint wall shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 4;
    roughCircle(ctx, this.x + 5, this.y + 7, this.R, seed + 3, 0.2, 18);

    // face
    roughCirclePath(ctx, this.x, this.y, this.R, seed + 7, 0.08, 20);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.4;
    ctx.stroke();

    // twelve doodle ticks
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      const r1 = this.R * 0.82, r2 = this.R * 0.93;
      ctx.strokeStyle = i % 3 ? 'rgba(0,0,0,0.6)' : '#000';
      roughLine(ctx, this.x + Math.cos(a) * r1, this.y + Math.sin(a) * r1,
        this.x + Math.cos(a) * r2, this.y + Math.sin(a) * r2, seed + 31 + i * 5, 1.4);
    }

    // hands
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.4;
    roughLine(ctx, this.x, this.y,
      this.x + Math.cos(this.handB) * this.R * 0.62,
      this.y + Math.sin(this.handB) * this.R * 0.62, seed + 53, 2.2);
    ctx.lineWidth = 2.6;
    roughLine(ctx, this.x, this.y,
      this.x + Math.cos(this.handA) * this.R * 0.86,
      this.y + Math.sin(this.handA) * this.R * 0.86, seed + 61, 2.4);

    // hub
    roughCirclePath(ctx, this.x, this.y, 4, seed + 79, 0.3, 8);
    ctx.fillStyle = '#000';
    ctx.fill();

    ctx.restore();
  }

  hitTest(x, y) {
    return dist(x, y, this.x, this.y) < this.R * 0.98;
  }
}