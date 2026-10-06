'use strict';

/* ============================================================
   24. GHOSTLY WAIL — a doodle sheet-ghost drifts straight at the
   star. Every so often it WAILS: shriek rings blast outward and
   shove the star around, while stray tears are flung everywhere.
   ============================================================ */

class GhostAttack extends Enemy {
  static type = 'ghost';
  static family = 'entity';

  init(params) {
    super.init(params);
    this.x = rnd(0.2, 0.8) * this.w;
    this.y = rnd(0.2, 0.6) * this.h;
    this.R = rnd(32, 44);
    this.spd = 42 + this.diff * 13;
    this.ang = rnd(TAU);
    this.wailT = rnd(0.8, 1.5);
    this.wailInt = Math.max(1.1, rnd(1.7, 2.3) - this.diff * 0.04);
    this.rings = [];
    this.life = Math.max(6, 8.5 - (this.diff - 1) * 0.25);
    this.label = 'GHOSTLY WAIL';
  }

  update(dt) {
    super.update(dt);
    const g = this.game, p = g.player;

    if (p.alive) {
      this.ang = approachAngle(this.ang, angTo(this.x, this.y, p.x, p.y), dt * 1.7);
    }
    this.x += Math.cos(this.ang) * this.spd * dt;
    this.y += Math.sin(this.ang) * this.spd * dt;
    this.x = clamp(this.x, 22, this.w - 22);
    this.y = clamp(this.y, 22, this.h - 22);

    this.wailT -= dt;
    if (this.wailT <= 0) {
      this.wailT = this.wailInt * rnd(0.7, 1.2);
      this.wail();
    }

    // expanding shriek rings push the star (no direct damage, but
    // shoved into the INK there absolutely is)
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += r.v * dt;
      if (p.alive) {
        const d = dist(p.x, p.y, this.x, this.y) || 1;
        const band = Math.abs(d - r.r);
        if (band < 22) {
          const k = 1 - band / 22;
          const nx = (p.x - this.x) / d, ny = (p.y - this.y) / d;
          const push = 1650 * k * (r.r / r.max);
          p.fx += nx * push;
          p.fy += ny * push;
        }
      }
      if (r.r >= r.max) this.rings.splice(i, 1);
    }

    if (this.age >= this.life) {
      this.sparks(this.x, this.y, 14);
      this.finish();
    }
  }

  wail() {
    const g = this.game;
    this.fireFlash(3);
    this.rings.push({ r: this.R + 6, v: 230, max: this.R + 150 + rnd(0, 80) });
    for (let i = 0; i < 3; i++) {
      const a = rnd(TAU), s = rnd(150, 260);
      g.bullets.spawnBullet({
        x: this.x, y: this.y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        r: 5, style: 'tear', behavior: 'straight', maxLife: 4
      });
    }
  }

  draw(ctx) {
    const seed = this.seed;
    const f = clamp((this.life - this.age) / 0.5, 0, 1);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // shriek rings
    for (const r of this.rings) {
      const a = 0.5 * (1 - r.r / r.max);
      if (a <= 0.02) continue;
      ctx.strokeStyle = `rgba(0,0,0,${a.toFixed(2)})`;
      ctx.lineWidth = 3;
      roughCircle(ctx, this.x, this.y, r.r, seed + r.r * 0.31, 0.12, 20);
    }

    // sheet-ghost body
    ctx.globalAlpha = f;
    ctx.beginPath();
    ctx.moveTo(this.x - this.R * 0.9, this.y + this.R * 0.72);
    ctx.lineTo(this.x - this.R * 0.9, this.y - this.R * 0.3);
    ctx.quadraticCurveTo(this.x - this.R * 0.9, this.y - this.R * 1.18, this.x, this.y - this.R * 1.18);
    ctx.quadraticCurveTo(this.x + this.R * 0.9, this.y - this.R * 1.18, this.x + this.R * 0.9, this.y - this.R * 0.3);
    ctx.lineTo(this.x + this.R * 0.9, this.y + this.R * 0.72);
    for (let i = 5; i >= 0; i--) {
      const wx = this.x + (i - 2.5) * this.R * 0.36;
      const wy = this.y + this.R * 0.72 + Math.abs(Math.sin(i * 1.31 + this.age * 3.2)) * this.R * 0.26;
      ctx.lineTo(wx, wy);
    }
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // face: eyes track the drift, wail mouth hangs open
    const ex = Math.cos(this.ang) * 2.4, ey = Math.sin(this.ang) * 2.4;
    ctx.fillStyle = '#000';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(this.x + s * this.R * 0.32 + ex, this.y - this.R * 0.32 + ey, this.R * 0.13, 0, TAU);
      ctx.fill();
    }
    roughEllipsePath(ctx, this.x, this.y + this.R * 0.24, this.R * 0.24, this.R * 0.33, seed + 41, 0.14, 10);
    ctx.fillStyle = '#000';
    ctx.fill();

    ctx.restore();
  }

  hitTest(x, y) {
    return dist(x, y, this.x, this.y) < this.R * 0.95;
  }
}