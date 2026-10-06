'use strict';

/* ============================================================
   1. CURVED LASERS — dashed warning -> fat burning marker beam
   that cuts across the whole screen along a quadratic bezier.
   BUFF: up to 3 simultaneous beams, fatter core (22–34px),
   much shorter warning (0.75s) and a longer burn.
   ============================================================ */

class CurvedLaserAttack extends Enemy {
  static type = 'laser';
  static family = 'beam';

  init(params) {
    super.init(params);
    const count = Math.max(1, params.count || 1);
    this.variant = params.variant | 0;
    this.beams = [];
    for (let i = 0; i < count; i++) this.beams.push(this.makeBeam(i * 97));

    this.phase = 'warn';
    // buff: less time to read the warning
    this.t = Math.max(0.45, 0.75 - (this.diff - 1) * 0.05);
    this.label = 'CURVED LASER';
  }

  makeBeam(seedOff) {
    const w = this.w, h = this.h;
    const edge = rint(0, 3);
    const opp = (edge + 2) % 4;
    const pt = (e, t) =>
      e === 0 ? { x: t * w, y: -70 } :
      e === 1 ? { x: w + 70, y: t * h } :
      e === 2 ? { x: t * w, y: h + 70 } :
                { x: -70, y: t * h };

    const a = pt(edge, rnd(0.12, 0.88));
    const b = pt(opp, rnd(0.12, 0.88));
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const nx = -(b.y - a.y), ny = (b.x - a.x);
    const nl = Math.hypot(nx, ny) || 1;
    // variant: 0 = gentle sweep, 1 = tight hook, 2 = wild S-swing
    const curv = this.variant === 1 ? rnd(0.26, 0.42) : this.variant === 2 ? rnd(0.14, 0.5) : rnd(0.12, 0.3);
    const off = curv * nl * (chance(0.5) ? 1 : -1);
    const c = { x: mx + nx / nl * off, y: my + ny / nl * off };

    return {
      pts: quadBezier(a.x, a.y, c.x, c.y, b.x, b.y, 46),
      // buff: fatter beam
      width: rnd(22, 34),
      dashOffset: rnd(0, 200),
      seed: this.seed + seedOff
    };
  }

  update(dt) {
    super.update(dt);
    if (this.phase === 'warn') {
      this.t -= dt;
      for (const bm of this.beams) bm.dashOffset += dt * 1150;
      if (this.t <= 0) {
        this.phase = 'fire';
        // buff: burns longer
        this.t = Math.max(0.7, 1.15 - (this.diff - 1) * 0.05);
        this.fireFlash(7);
      }
    } else {
      this.t -= dt;
      if (CLOCK.frame % 3 === 0) {
        const bm = this.beams[rint(0, this.beams.length - 1)];
        const p = bm.pts[rint(0, bm.pts.length - 1)];
        this.game.bullets.spawnParticle({
          x: p.x + rnd(-8, 8), y: p.y + rnd(-8, 8),
          vx: rnd(-90, 90), vy: rnd(-90, 90),
          life: 0.4, size: rnd(1.5, 4), g: rint(70, 150), drag: 4
        });
      }
      if (this.t <= 0) this.finish();
    }
  }

  drawBeamWarn(ctx, bm) {
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 3.5;
    dashedPolyline(ctx, bm.pts, 18, 15, bm.seed, 2, bm.dashOffset);
    const k = Math.floor((CLOCK.time * 6) % bm.pts.length);
    const p = bm.pts[k];
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 2;
    roughCircle(ctx, p.x, p.y, 9 + Math.sin(CLOCK.time * 18) * 3, bm.seed + k, 0.25, 9);
  }

  drawBeamFire(ctx, bm) {
    const fade = this.t < 0.18 ? this.t / 0.18 : 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.13)';
    ctx.lineWidth = bm.width * 2.7 * fade;
    roughPath(ctx, bm.pts, bm.seed, 4.5);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = bm.width * fade;
    roughPath(ctx, bm.pts, bm.seed + 5, 4.5);

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(1.5, bm.width * 0.22 * fade);
    roughPath(ctx, bm.pts, bm.seed + 9, 3.5);
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const bm of this.beams) {
      if (this.phase === 'warn') this.drawBeamWarn(ctx, bm);
      else this.drawBeamFire(ctx, bm);
    }
  }

  hitTest(x, y) {
    if (this.phase !== 'fire') return false;
    for (const bm of this.beams) {
      if (distToPolyline(x, y, bm.pts) < bm.width * 0.5) return true;
    }
    return false;
  }
}
