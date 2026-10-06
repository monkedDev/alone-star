'use strict';

/* ============================================================
   3. FLYING EYES — huge eyeballs that stare at the star and
   spit tear-bullets at it every 2 seconds.
   ============================================================ */

class FlyingEyeAttack extends Enemy {
  static type = 'eye';
  static family = 'entity';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    const count = Math.max(1, params.count || 1);
    // variant: 0 = drifty stare, 1 = tight stalker, 2 = 5-tear bursts
    this.variant = params.variant | 0;
    this.eyes = [];
    for (let i = 0; i < count; i++) {
      const side = rint(0, 3);
      const x = side === 0 ? rnd(w * 0.2, w * 0.8) : side === 1 ? w - 60 : side === 2 ? rnd(w * 0.2, w * 0.8) : 60;
      const y = side === 0 ? 70 : side === 1 ? rnd(h * 0.2, h * 0.8) : side === 2 ? h - 70 : rnd(h * 0.2, h * 0.8);
      this.eyes.push({
        x, y, vx: 0, vy: 0,
        r: rnd(30, 46),
        wander: rnd(TAU),
        fireT: rnd(0.5, 2),
        blinkT: rnd(0.8, 3),
        blink: 0,
        seed: rnd(1000)
      });
    }
    this.life = Math.max(8, 12 - (this.diff - 1) * 0.3);
    this.label = 'FLYING EYES';
  }

  update(dt) {
    super.update(dt);
    const p = this.game.player;
    const w = this.w, h = this.h;

    for (const e of this.eyes) {
      e.wander += dt * rnd(1, 1.6);

      // drift toward the star + wander
      let tx = 0, ty = 0;
      if (p.alive) {
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        tx = dx / d * 0.35;
        ty = dy / d * 0.35;
      }
      tx += Math.cos(e.wander) * 0.9;
      ty += Math.sin(e.wander * 1.31) * 0.9;

      const sp = 105 + this.diff * 8;
      e.vx = lerp(e.vx, tx * sp, Math.min(1, dt * 2.4));
      e.vy = lerp(e.vy, ty * sp, Math.min(1, dt * 2.4));
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.x = clamp(e.x, e.r, w - e.r);
      e.y = clamp(e.y, e.r, h - e.r);

      // blink
      e.blinkT -= dt;
      if (e.blinkT <= 0) { e.blink = 0.14; e.blinkT = rnd(1.4, 3.8); }
      if (e.blink > 0) e.blink -= dt;

      // tears every ~2 seconds
      e.fireT -= dt;
      if (e.fireT <= 0 && p.alive) {
        e.fireT = this.variant === 2 ? 1.35 : 2.0;
        const base = angTo(e.x, e.y, p.x, p.y);
        const speed = 330 + this.diff * 45;
        const spread = this.variant === 2 ? 0.14 : 0.22;
        const shots = this.variant === 2 ? 5 : 3;
        for (let k = 0; k < shots; k++) {
          const kk = k - (shots - 1) / 2;
          const a = base + kk * spread;
          this.game.bullets.spawnBullet({
            x: e.x + Math.cos(a) * e.r * 0.8,
            y: e.y + Math.sin(a) * e.r * 0.8,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            r: 7.5,
            style: 'tear',
            behavior: 'straight',
            trail: 1
          });
        }
        this.sparks(e.x, e.y, 4);
      }
    }

    if (this.age >= this.life) this.finish();
  }

  drawEye(ctx, e) {
    const p = this.game.player;
    const r = e.r;

    // eye white
    roughEllipsePath(ctx, e.x, e.y, r, r * 0.94, e.seed, 0.07, 22);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.4;
    ctx.stroke();

    // grey veins
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5 + e.seed;
      const x1 = e.x + Math.cos(a) * r * 0.95;
      const y1 = e.y + Math.sin(a) * r * 0.95;
      const x2 = e.x + Math.cos(a) * r * 0.55;
      const y2 = e.y + Math.sin(a) * r * 0.55;
      roughLine(ctx, x1, y1, x2, y2, e.seed + i * 5, 3);
    }

    if (e.blink > 0) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x - r, e.y);
      ctx.lineTo(e.x + r, e.y);
      ctx.stroke();
      return;
    }

    // iris + pupil follow the star
    let lx = 0, ly = 1;
    if (p.alive) {
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      lx = dx / d; ly = dy / d;
    }
    const ix = e.x + lx * r * 0.36;
    const iy = e.y + ly * r * 0.36;
    roughCirclePath(ctx, ix, iy, r * 0.4, e.seed + 3, 0.12, 14);
    ctx.fillStyle = 'rgba(140,140,140,0.95)';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    roughCirclePath(ctx, ix, iy, r * 0.19, e.seed + 7, 0.16, 10);
    ctx.fillStyle = '#000';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ix - r * 0.1, iy - r * 0.12, r * 0.07, 0, TAU);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // heavy lid + lashes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.arc(e.x, e.y - r * 0.1, r * 0.98, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      const a = -Math.PI / 2 + i * 0.3;
      roughLine(ctx,
        e.x + Math.cos(a) * r * 0.95, e.y + Math.sin(a) * r * 0.95,
        e.x + Math.cos(a) * (r + 9), e.y + Math.sin(a) * (r + 9),
        e.seed + i * 9, 1.4);
    }
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    for (const e of this.eyes) this.drawEye(ctx, e);
  }

  hitTest(x, y) {
    for (const e of this.eyes) {
      if (dist(x, y, e.x, e.y) < e.r * 0.95) return true;
    }
    return false;
  }
}
