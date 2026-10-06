'use strict';

/* ============================================================
   BulletPool — three synchronized ObjectPools:
     • bullets   (ink drops, tears, shards, flies)
     • particles (grey smoke / debris)
     • rays      (marker beams — used by the menu core at 9 FPS)
   Nothing is ever allocated during gameplay.
   ============================================================ */

const BULLET_DEFAULTS = {
  alive: false, x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, drag: 0,
  r: 6, age: 0, life: 0, maxLife: 0, rot: 0, spin: 0,
  style: 'blob', behavior: 'straight', seed: 0,
  sway: 0, swayFreq: 6, swayPhase: 0,
  homeX: 0, homeY: 0, impulseT: 0, flySpeed: 300, trail: 0
};

const PARTICLE_DEFAULTS = {
  alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1,
  size: 3, g: 120, drag: 2, seed: 0, ring: false
};

const RAY_DEFAULTS = {
  alive: false, x: 0, y: 0, a: 0, spin: 0, maxLen: 200,
  life: 1, age: 0, w: 6, black: true, seed: 0, discrete: false, taper: true
};

function makeBullet() { return Object.assign({}, BULLET_DEFAULTS); }
function makeParticle() { return Object.assign({}, PARTICLE_DEFAULTS); }
function makeRay() { return Object.assign({}, RAY_DEFAULTS); }

class BulletPool {
  constructor() {
    this.bullets = new ObjectPool(makeBullet, o => { o.alive = false; }, 400);
    this.particles = new ObjectPool(makeParticle, o => { o.alive = false; }, 700);
    this.rays = new ObjectPool(makeRay, o => { o.alive = false; }, 120);
  }

  spawnBullet(cfg) {
    const b = this.bullets.obtain();
    Object.assign(b, BULLET_DEFAULTS, cfg);
    b.alive = true;
    if (!b.seed) b.seed = rnd(1000);
    if (b.maxLife > 0) b.life = b.maxLife;
    return b;
  }

  spawnParticle(cfg) {
    const p = this.particles.obtain();
    Object.assign(p, PARTICLE_DEFAULTS, cfg);
    p.alive = true;
    p.seed = rnd(1000);
    p.maxLife = cfg.maxLife || cfg.life || 1;
    p.life = p.maxLife;
    return p;
  }

  spawnRay(cfg) {
    const r = this.rays.obtain();
    Object.assign(r, RAY_DEFAULTS, cfg);
    r.alive = true;
    r.age = 0;
    if (!r.seed) r.seed = rnd(1000);
    return r;
  }

  /** grey ink-smoke burst */
  burst(x, y, n, opts = {}) {
    const s0 = opts.s0 !== undefined ? opts.s0 : 60;
    const s1 = opts.s1 !== undefined ? opts.s1 : 300;
    const life = opts.life !== undefined ? opts.life : 0.9;
    const size = opts.size !== undefined ? opts.size : 4;
    const g = opts.g;
    const drag = opts.drag !== undefined ? opts.drag : 3;
    for (let i = 0; i < n; i++) {
      const a = rnd(TAU), s = rnd(s0, s1);
      this.spawnParticle({
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rnd(0.25, life),
        size: rnd(1.2, size),
        g: g !== undefined ? g : rint(60, 175),
        drag
      });
    }
  }

  /* ---------------- update ---------------- */

  update(dt, game) {
    const W = game.w, H = game.h, m = 80;

    /* bullets */
    const bl = this.bullets.used;
    for (let i = bl.length - 1; i >= 0; i--) {
      const b = bl[i];
      if (!b.alive) continue;
      b.age += dt;

      switch (b.behavior) {
        case 'straight':
          b.vx += b.ax * dt;
          b.vy += b.ay * dt;
          if (b.drag) { const k = Math.exp(-b.drag * dt); b.vx *= k; b.vy *= k; }
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          break;

        case 'sway':
          b.x += (b.vx + Math.sin(b.age * b.swayFreq + b.swayPhase) * b.sway) * dt;
          b.y += b.vy * dt;
          break;

        case 'shard':
          b.vy += 620 * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.rot += b.spin * dt;
          break;

        case 'bounce': { // ricochet orbs
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
          if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
          if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
          if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy); }
          break;
        }

        case 'fly': {
          b.impulseT -= dt;
          if (b.impulseT <= 0) {
            b.impulseT = rnd(0.1, 0.3);
            const a = rnd(TAU), s = rnd(80, 220);
            b.vx += Math.cos(a) * s;
            b.vy += Math.sin(a) * s;
          }
          const dx = b.homeX - b.x, dy = b.homeY - b.y;
          const d = Math.hypot(dx, dy) || 1;
          b.vx += dx / d * 300 * dt;
          b.vy += dy / d * 300 * dt;
          const k = Math.exp(-1.7 * dt);
          b.vx *= k;
          b.vy *= k;
          const sp = Math.hypot(b.vx, b.vy);
          if (sp > b.flySpeed) { b.vx *= b.flySpeed / sp; b.vy *= b.flySpeed / sp; }
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < 18) b.vx += 260 * dt;
          if (b.x > W - 18) b.vx -= 260 * dt;
          if (b.y < 18) b.vy += 260 * dt;
          if (b.y > H - 18) b.vy -= 260 * dt;
          break;
        }
      }

      if (b.maxLife > 0) {
        b.life -= dt;
        if (b.life <= 0) { b.alive = false; continue; }
      }

      if (b.behavior !== 'fly' && b.behavior !== 'bounce' &&
          (b.x < -m || b.x > W + m || b.y < -m || b.y > H + m)) {
        b.alive = false;
        continue;
      }

      if (b.trail > 0 && CLOCK.frame % 4 === 0) {
        this.spawnParticle({
          x: b.x + rnd(-2, 2), y: b.y + rnd(-2, 2),
          vx: rnd(-25, 25), vy: rnd(-5, 40),
          life: 0.4, size: rnd(1, 3.2), g: rint(150, 205), drag: 4
        });
      }
    }

    /* particles */
    const pa = this.particles.used;
    for (let i = pa.length - 1; i >= 0; i--) {
      const p = pa[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    /* rays — discrete ones are stepped by the Menu at exactly 9 FPS */
    const ra = this.rays.used;
    for (let i = ra.length - 1; i >= 0; i--) {
      const r = ra[i];
      if (!r.alive) continue;
      if (r.discrete) continue;
      r.age += dt;
      r.a += r.spin * dt;
      if (r.age >= r.life) r.alive = false;
    }

    this.bullets.sweep();
    this.particles.sweep();
    this.rays.sweep();
  }

  clear() {
    this.bullets.clear();
    this.particles.clear();
    this.rays.clear();
  }

  /* ---------------- draw ---------------- */

  drawBullets(ctx) {
    const arr = this.bullets.used;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      if (!b.alive) continue;

      switch (b.style) {
        case 'drop': { // huge absurd ink drop
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
          roughEllipsePath(ctx, 0, 0, b.r * 0.82, b.r * 1.3, b.seed, 0.16, 12);
          ctx.fillStyle = '#000';
          ctx.fill();
          // little tail wobble
          ctx.strokeStyle = 'rgba(0,0,0,0.55)';
          ctx.lineWidth = 1.6;
          roughLine(ctx, -b.r * 0.3, -b.r * 1.4, b.r * 0.25, -b.r * 1.7, b.seed + 3, 1.4);
          ctx.restore();
          break;
        }

        case 'tear': { // eye droplet
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(angTo(0, 0, b.vx, b.vy) + Math.PI / 2);
          roughEllipsePath(ctx, 0, b.r * 0.3, b.r * 0.7, b.r, b.seed, 0.14, 10);
          ctx.fillStyle = '#000';
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.arc(-b.r * 0.2, b.r * 0.2, b.r * 0.2, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        }

        case 'shard': { // explosion debris
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rot);
          roughCirclePath(ctx, 0, 0, b.r, b.seed, 0.3, 7);
          ctx.fillStyle = '#000';
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 1.2;
          roughLine(ctx, -b.r * 2.2, 0, -b.r, 0, b.seed + 5, 1);
          ctx.restore();
          break;
        }

        case 'fly': { // swarm mote
          roughCirclePath(ctx, b.x, b.y, b.r, b.seed, 0.3, 6);
          ctx.fillStyle = '#000';
          ctx.fill();
          if (CLOCK.frame % 3 === 0) {
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1.3;
            const wa = wob(b.seed + CLOCK.tick9, 1.2);
            roughLine(ctx, b.x - 5, b.y - 3 + wa, b.x, b.y, b.seed + 7, 1.4);
            roughLine(ctx, b.x + 5, b.y - 3 - wa, b.x, b.y, b.seed + 13, 1.4);
          }
          break;
        }

        case 'chevron': { // stampeding arrow
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(angTo(0, 0, b.vx, b.vy));
          const s = b.r;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 3.6;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(-s + wob(b.seed, 1.4), -s * 0.85 + wob(b.seed + 3, 1.4));
          ctx.lineTo(s * 0.7, wob(b.seed + 5, 1.2));
          ctx.lineTo(-s + wob(b.seed + 7, 1.4), s * 0.85 + wob(b.seed + 9, 1.4));
          ctx.stroke();
          ctx.restore();
          break;
        }

        case 'orb': { // heavy ricochet ball
          roughCirclePath(ctx, b.x, b.y, b.r, b.seed, 0.16, 13);
          ctx.fillStyle = '#000';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 1.8;
          roughLine(ctx, b.x - b.r * 0.5, b.y - b.r * 0.35, b.x + b.r * 0.35, b.y + b.r * 0.4, b.seed + wseed(), b.r * 0.2);
          // motion streak
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 2.4;
          roughLine(ctx, b.x - b.vx * 0.055, b.y - b.vy * 0.055, b.x, b.y, b.seed + 17, 3);
          break;
        }

        default: { // generic ink blob
          roughCirclePath(ctx, b.x, b.y, b.r, b.seed, 0.2, 10);
          ctx.fillStyle = '#000';
          ctx.fill();
        }
      }
    }
  }

  drawParticles(ctx) {
    const arr = this.particles.used;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      if (!p.alive) continue;
      const k = p.life / p.maxLife;
      const a = (k * 0.85).toFixed(3);
      if (p.ring) {
        ctx.strokeStyle = `rgba(${p.g},${p.g},${p.g},${a})`;
        ctx.lineWidth = 1.6;
        roughCircle(ctx, p.x, p.y, p.size * (1.6 - k), p.seed, 0.2, 9);
      } else {
        ctx.fillStyle = `rgba(${p.g},${p.g},${p.g},${a})`;
        roughCirclePath(ctx, p.x, p.y, p.size * (0.35 + k * 0.85), p.seed, 0.28, 7);
        ctx.fill();
      }
    }
  }

  /** broken marker rays (menu core / specials) drawn as Canvas vectors */
  drawRays(ctx) {
    const arr = this.rays.used;
    ctx.lineCap = 'round';
    for (let i = 0; i < arr.length; i++) {
      const r = arr[i];
      if (!r.alive) continue;
      const t = clamp(r.age / r.life, 0, 1);
      const len = r.maxLen * Math.sin(t * Math.PI);
      if (len < 4) continue;
      const steps = 14;
      const col = r.black ? '0,0,0' : '120,120,120';
      ctx.strokeStyle = `rgba(${col},${(0.9 * Math.sin(t * Math.PI) + 0.1).toFixed(3)})`;
      ctx.lineWidth = r.w;
      ctx.beginPath();
      let pen = false;
      for (let s = 0; s <= steps; s++) {
        const k = s / steps;
        // broken marker: chunks are skipped / re-inked every 3 frames
        const inked = hash1(r.seed + s * 3.7 + wseed() * 1.31) > 0.22;
        const d = len * k;
        const lateral = wob(r.seed + s * 5.1, 4 + k * 16);
        const x = r.x + Math.cos(r.a) * d - Math.sin(r.a) * lateral;
        const y = r.y + Math.sin(r.a) * d + Math.cos(r.a) * lateral;
        if (inked) {
          if (!pen) { ctx.moveTo(x, y); pen = true; }
          else ctx.lineTo(x, y);
        } else {
          pen = false;
        }
      }
      ctx.stroke();

      // arrow-ish head tick
      ctx.lineWidth = Math.max(1.5, r.w * 0.5);
      const hx = r.x + Math.cos(r.a) * len;
      const hy = r.y + Math.sin(r.a) * len;
      const ha = r.a + Math.PI / 2;
      roughLine(ctx, hx, hy, hx - Math.cos(r.a) * 14 + Math.cos(ha) * 9, hy - Math.sin(r.a) * 14 + Math.sin(ha) * 9, r.seed + 40, 2);
      roughLine(ctx, hx, hy, hx - Math.cos(r.a) * 14 - Math.cos(ha) * 9, hy - Math.sin(r.a) * 14 - Math.sin(ha) * 9, r.seed + 44, 2);
    }
  }
}
