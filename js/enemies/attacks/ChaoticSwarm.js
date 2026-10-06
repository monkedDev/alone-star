'use strict';

/* ============================================================
   11. CHAOTIC SWARM — a cloud of tiny flies dashes erratically
   through the sheet while slowly migrating as one mass.
   ============================================================ */

class ChaoticSwarmAttack extends Enemy {
  static type = 'swarm';
  static family = 'swarm';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    this.n = Math.min(190, Math.round(90 + (this.diff - 1) * 24));
    this.home = { x: w / 2, y: h / 2 };
    this.target = { x: w / 2, y: h / 2 };
    this.retargetT = 1.6;
    this.life = Math.max(7, 9.5 - (this.diff - 1) * 0.2);
    this.flies = [];
    for (let i = 0; i < this.n; i++) this.flies.push(this.spawnFly());
    this.label = 'CHAOTIC SWARM';
  }

  spawnFly() {
    const h = this.home;
    return this.game.bullets.spawnBullet({
      x: h.x + rnd(-70, 70),
      y: h.y + rnd(-70, 70),
      vx: rnd(-160, 160),
      vy: rnd(-160, 160),
      r: rnd(2.4, 3.6),
      style: 'fly',
      behavior: 'fly',
      homeX: h.x,
      homeY: h.y,
      impulseT: rnd(0, 0.3),
      flySpeed: rnd(240, 330),
      maxLife: 0
    });
  }

  update(dt) {
    super.update(dt);

    // slow migration of the whole cloud
    this.retargetT -= dt;
    if (this.retargetT <= 0) {
      this.retargetT = rnd(2, 3.4);
      this.target = { x: rnd(0.2, 0.8) * this.w, y: rnd(0.2, 0.8) * this.h };
    }
    this.home.x = lerp(this.home.x, this.target.x, Math.min(1, dt * 1.1));
    this.home.y = lerp(this.home.y, this.target.y, Math.min(1, dt * 1.1));

    if (this.age < this.life) {
      // keep the cloud at full density — dead flies are reborn
      for (let i = 0; i < this.flies.length; i++) {
        const b = this.flies[i];
        if (b.alive) {
          b.homeX = this.home.x;
          b.homeY = this.home.y;
        } else {
          this.flies[i] = this.spawnFly();
        }
      }
    } else {
      // attack ends: let the swarm decay quickly
      for (const b of this.flies) {
        if (b.alive && b.maxLife === 0) {
          b.maxLife = 1.4;
          b.life = 1.4;
        }
      }
      this.flies = [];
      this.finish();
    }
  }

  draw(ctx) {
    // faint grey migration halo
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 30;
    roughCircle(ctx, this.home.x, this.home.y, 95 + wob(this.seed, 14), this.seed, 0.18, 20);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    roughCircle(ctx, this.home.x, this.home.y, 118 + wob(this.seed + 3, 10), this.seed + 5, 0.1, 24);
    ctx.setLineDash([]);
    ctx.restore();
  }
}
