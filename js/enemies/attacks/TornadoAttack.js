'use strict';

/* ============================================================
   21. TORNADO — a fat ink whirlwind dances across the sheet,
   dragging the star and whole streams of ink toward its funnel,
   then spitting the mess back out. Pure chaos, zero excuses.
   ============================================================ */

class TornadoAttack extends Enemy {
  static type = 'tornado';
  static family = 'field';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    this.cx = w * (0.5 + rnd(-0.06, 0.06));     // travel centre
    this.horiz = chance(0.5) ? 1 : -1;
    this.travelR = w * rnd(0.2, 0.3);
    this.R = rnd(46, 64);
    this.period = rnd(4.6, 6.6);
    this.dir = chance(0.5) ? 1 : -1;            // swirl direction
    this.x = this.cx;
    this.funnelTop = h * rnd(0.14, 0.34);
    this.funnelBot = h * rnd(0.78, 0.95);
    this.life = Math.max(6, 8.5 - (this.diff - 1) * 0.25);
    this.spitT = rnd(0.55, 1.0);
    this.label = 'TORNADO';
  }

  update(dt) {
    super.update(dt);
    const g = this.game;
    const p = g.player;
    this.x = this.cx + this.horiz * Math.sin(this.age / this.period * TAU) * this.travelR;

    const midY = (this.funnelTop + this.funnelBot) * 0.5;
    const pullR = this.R * 2.6;

    // whirl the star toward the axis (and around it)
    if (p.alive) {
      const dx = this.x - p.x, dy = midY - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < pullR) {
        const f = 1 - d / pullR;
        const nx = dx / d, ny = dy / d;
        const pull = 620 * f * f + 130 * f;
        p.fx += nx * pull + ny * pull * 0.78 * this.dir;
        p.fy += ny * pull - nx * pull * 0.78 * this.dir;
      }
      if (d < this.R * 0.55) p.hit();
    }

    // swirl the ink around too (the funnel gobbles bullets)
    const bl = g.bullets.bullets.used;
    for (let i = 0; i < bl.length; i++) {
      const b = bl[i];
      if (!b.alive) continue;
      const dx = this.x - b.x, dy = midY - b.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < pullR * 1.15) {
        const f = 1 - d / (pullR * 1.15);
        b.vx += (dx / d * 160 - dy / d * 310 * this.dir) * f * dt;
        b.vy += (dy / d * 160 + dx / d * 310 * this.dir) * f * dt;
      }
    }

    // spit stray drops out of the funnel
    this.spitT -= dt;
    if (this.spitT <= 0) {
      this.spitT = Math.max(0.32, rnd(0.5, 0.95) - this.diff * 0.03);
      const a = rnd(TAU);
      const sp = rnd(150, 260);
      g.bullets.spawnBullet({
        x: this.x + rnd(-5, 5), y: midY + rnd(-10, 10),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rnd(5, 8), style: 'blob', behavior: 'straight', maxLife: 5
      });
    }

    if (this.age >= this.life) {
      this.sparks(this.x, midY, 20);
      this.finish();
    }
  }

  draw(ctx) {
    const t = this.age;
    const fade = clamp((this.life - t) / 0.6, 0, 1);
    const seed = this.seed;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // wind bands: sine-swung strokes, narrow at the top of the funnel
    const N = 5, steps = 16;
    for (let b = 0; b < N; b++) {
      const P = [];
      for (let s = 0; s <= steps; s++) {
        const k = s / steps;
        const yy = lerp(this.funnelTop, this.funnelBot, easeInOutCubic(k));
        const rx = this.R * (0.28 + 0.78 * k);
        const bend = Math.sin(b * 1.35 + t * 3.4 * this.dir + k * 3.2) * rx;
        P.push({ x: this.x + bend + wob(seed + b * 41 + s, 2.4), y: yy + wob(seed + b * 57 + s, 2.4) });
      }
      ctx.strokeStyle = b % 2 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.28)';
      ctx.lineWidth = b % 2 ? 2.6 : 5;
      roughPath(ctx, P, seed + b * 13, 2.6);
    }

    // sloppy cloud head
    roughEllipsePath(ctx, this.x, this.funnelTop - 6, this.R * 1.15, this.R * 0.38, seed + 71, 0.25, 16);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  hitTest(x, y) {
    if (this.age < 0.25 || this.age > this.life - 0.4) return false;
    const k = clamp((y - this.funnelTop) / (this.funnelBot - this.funnelTop), 0, 1);
    const rx = this.R * (0.3 + 0.7 * k);
    return Math.abs(x - this.x) / rx <= 1;
  }
}