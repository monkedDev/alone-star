'use strict';

/* ============================================================
   14. LIGHTNING STRIKES — a storm scribble blinks a warning,
   then a jagged marker bolt flashes through the sheet.
   ============================================================ */

class LightningStrikeAttack extends Enemy {
  static type = 'lightning';
  static family = 'beam';

  init(params) {
    super.init(params);
    this.life = 6.5;
    this.width = rnd(9, 15);
    this.buildPath();
    this.phase = 'warn';
    this.t = 0.5;
    this.label = 'LIGHTNING';
  }

  buildPath() {
    const w = this.w, h = this.h;
    const fromTop = chance(0.7);
    const sx = rnd(0.08, 0.92) * w;
    const start = fromTop ? { x: sx, y: -40 } : { x: chance(0.5) ? -40 : w + 40, y: rnd(0.1, 0.5) * h };
    const end = fromTop
      ? { x: clamp(sx + rnd(-0.35, 0.35) * w, 30, w - 30), y: rnd(0.55, 0.95) * h }
      : { x: rnd(0.3, 0.9) * w, y: rnd(0.4, 0.95) * h };

    // jagged polyline
    const n = 9;
    this.pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const jx = i === 0 || i === n ? 0 : rnd(-55, 55);
      const jy = i === 0 || i === n ? 0 : rnd(-16, 16);
      this.pts.push({ x: lerp(start.x, end.x, t) + jx, y: lerp(start.y, end.y, t) + jy });
    }

    // side branches
    this.branches = [];
    for (let b = 0; b < 2; b++) {
      const i = rint(2, n - 3);
      const p = this.pts[i];
      const a = rnd(-2.4, -0.7) + (chance(0.5) ? 0 : Math.PI);
      const len = rnd(50, 120);
      this.branches.push([
        p,
        { x: p.x + Math.cos(a) * len * 0.5 + rnd(-25, 25), y: p.y + Math.sin(a) * len * 0.5 },
        { x: p.x + Math.cos(a) * len, y: p.y + Math.sin(a) * len }
      ]);
    }
    this.seed = rnd(1000);
    this.origin = start;
  }

  update(dt) {
    super.update(dt);
    this.t -= dt;
    if (this.t <= 0) {
      if (this.phase === 'warn') {
        this.phase = 'fire';
        this.t = 0.45;
        this.fireFlash(8);
        this.sparks(this.origin.x, Math.max(20, this.origin.y), 16);
      } else {
        if (this.age >= this.life) { this.finish(); return; }
        this.phase = 'warn';
        this.t = rnd(0.4, 0.7);
        this.buildPath();
      }
    }
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const s = this.seed;

    if (this.phase === 'warn') {
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 2.5;
      dashedPolyline(ctx, this.pts, 12, 12, s, 2.5, CLOCK.time * 420);
      // storm scribble above the origin
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      roughCircle(ctx, this.origin.x, Math.max(26, this.origin.y), 26 + Math.sin(CLOCK.time * 16) * 5, s + 3, 0.3, 12);
      return;
    }

    const flick = hash1(wseed() * 3.3 + s) > 0.35 ? 1 : 0.55;
    ctx.save();
    ctx.globalAlpha = flick;

    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = this.width * 2.6;
    roughPath(ctx, this.pts, s, 5);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = this.width;
    roughPath(ctx, this.pts, s + 5, 5);

    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(2, this.width * 0.3);
    roughPath(ctx, this.pts, s + 9, 4);

    // branches
    ctx.strokeStyle = '#000';
    ctx.lineWidth = Math.max(3, this.width * 0.45);
    for (const br of this.branches) roughPath(ctx, br, s + 21, 4);
    ctx.restore();
  }

  hitTest(x, y) {
    if (this.phase !== 'fire') return false;
    if (distToPolyline(x, y, this.pts) < this.width * 0.5) return true;
    for (const br of this.branches) {
      if (distToPolyline(x, y, br) < this.width * 0.35) return true;
    }
    return false;
  }
}
