'use strict';

/* ============================================================
   25. INK CANNON — a sloppy doodle cannon mounts itself on a
   sheet edge. It aims at the star with a dashed sight line, then
   lobs heavy ink shells that arc over the page and splash.
   ============================================================ */

class CannonAttack extends Enemy {
  static type = 'cannon';
  static family = 'bullet';

  init(params) {
    super.init(params);
    this.side = chance(0.5) ? -1 : 1;
    this.y = rnd(0.25, 0.75) * this.h;
    this.R = 22;
    this.turn = chance(0.5) ? 1 : -1;       // wheel spin
    this.shots = 3 + (this.diff > 2.6 ? 1 : 0);
    this.shotN = 0;
    this.phase = 'aim';
    this.t = 0.7;                            // time to the first shot
    this.target = { x: this.w / 2, y: this.h / 2 };
    this.label = 'INK CANNON';
  }

  get base() { return { x: this.side < 0 ? 26 : this.w - 26, y: this.y }; }
  get muzzle() {
    const b = this.base;
    return { x: b.x + this.side * 64, y: b.y };
  }

  update(dt) {
    super.update(dt);
    const p = this.game.player;

    if (this.phase === 'aim') {
      // the barrel chases the star while the sight line burns in
      if (p.alive) {
        this.target.x += (p.x - this.target.x) * Math.min(1, dt * 6);
        this.target.y += (p.y - this.target.y) * Math.min(1, dt * 6);
      }
      this.t -= dt;
      if (this.t <= 0) this.fire();
    } else if (this.phase === 'reload') {
      this.t -= dt;
      if (this.t <= 0) {
        if (this.shotN >= this.shots) {
          this.sparks(this.muzzle.x, this.muzzle.y, 16);
          this.finish();
          return;
        }
        this.phase = 'aim';
        this.t = Math.max(0.45, 0.7 - this.diff * 0.05);
      }
    }
  }

  fire() {
    this.shotN++;
    const m = this.muzzle;
    this.fireFlash(6);
    this.game.renderer.addShake(5);
    // powder smoke
    this.game.bullets.burst(m.x, m.y, 8, { s0: 40, s1: 200, life: 0.4, size: 4, g: rint(40, 120) });
    const a = angTo(m.x, m.y, this.target.x, this.target.y) + rnd(-0.06, 0.06);
    const sp = rnd(380, 440);
    this.game.bullets.spawnBullet({
      x: m.x, y: m.y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: rnd(12, 15), style: 'drop', behavior: 'shard',
      spin: rnd(-3, 3), maxLife: 7
    });
    this.phase = 'reload';
    this.t = Math.max(0.5, 0.85 - this.diff * 0.06);
  }

  draw(ctx) {
    const seed = this.seed;
    const b = this.base, m = this.muzzle;
    const a = angTo(m.x, m.y, this.target.x, this.target.y);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // dashed sight line + the point where the shell will splash
    if (this.phase === 'aim') {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([7, 9]);
      ctx.lineDashOffset = -CLOCK.time * 60;
      const len = Math.min(520, dist(m.x, m.y, this.target.x, this.target.y));
      roughLine(ctx, m.x, m.y, m.x + Math.cos(a) * len, m.y + Math.sin(a) * len, seed + 3, 1.6);
      ctx.setLineDash([]);
      const blink = 0.5 + 0.5 * Math.sin(CLOCK.time * 10);
      ctx.strokeStyle = `rgba(0,0,0,${blink.toFixed(2)})`;
      ctx.lineWidth = 2.4;
      roughLine(ctx, this.target.x - 11, this.target.y, this.target.x + 11, this.target.y, seed + 7, 1.6);
      roughLine(ctx, this.target.x, this.target.y - 11, this.target.x, this.target.y + 11, seed + 11, 1.6);
    }

    // carriage wheel
    roughCirclePath(ctx, b.x, b.y, this.R, seed + 13, 0.14, 12);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    for (let i = 0; i < 4; i++) {
      const aa = i * TAU / 4 + CLOCK.time * 1.4 * this.turn;
      roughLine(ctx, b.x - Math.cos(aa) * this.R * 0.7, b.y - Math.sin(aa) * this.R * 0.7,
        b.x + Math.cos(aa) * this.R * 0.7, b.y + Math.sin(aa) * this.R * 0.7, seed + 17 + i * 9, 1.6);
    }

    // barrel (aimed at the target), pointing away from the edge
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(a);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    roughLine(ctx, 12, -8, 56, -8, seed + 23, 2);
    roughLine(ctx, 12, 8, 56, 8, seed + 29, 2);
    ctx.beginPath();
    ctx.arc(58, 0, 10, 0, TAU);   // muzzle ring
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  hitTest(x, y) {
    const b = this.base, m = this.muzzle;
    return distToPolyline(x, y, [b, m]) < 15 || dist(x, y, b.x, b.y) < this.R;
  }
}