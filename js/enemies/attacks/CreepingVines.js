'use strict';

/* ============================================================
   18. CREEPING VINES — thorny doodle vines grow inward from
   the sheet edges, claiming space segment by segment.
   ============================================================ */

class CreepingVinesAttack extends Enemy {
  static type = 'vines';
  static family = 'field';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    const count = Math.max(1, params.count || 2);
    this.life = Math.max(7, 10 - (this.diff - 1) * 0.3);
    this.vines = [];

    for (let i = 0; i < count; i++) {
      const edge = i % 4;
      const start =
        edge === 0 ? { x: rnd(0.1, 0.9) * w, y: -10 } :
        edge === 1 ? { x: w + 10, y: rnd(0.1, 0.9) * h } :
        edge === 2 ? { x: rnd(0.1, 0.9) * w, y: h + 10 } :
                     { x: -10, y: rnd(0.1, 0.9) * h };
      const target = {
        x: w / 2 + rnd(-0.28, 0.28) * w,
        y: h / 2 + rnd(-0.28, 0.28) * h
      };
      this.vines.push({
        pts: [start],
        a: angTo(start.x, start.y, target.x, target.y),
        target,
        growT: rnd(0, 0.2),
        speed: rnd(145, 195) + this.diff * 8,
        seed: rnd(1000),
        done: false
      });
    }
    this.label = 'CREEPING VINES';
  }

  update(dt) {
    super.update(dt);
    let growing = 0;

    for (const v of this.vines) {
      if (v.done) continue;
      growing++;
      v.growT -= dt;
      while (v.growT <= 0 && !v.done) {
        v.growT += 1 / v.speed * 14;
        const last = v.pts[v.pts.length - 1];
        // steer toward the target with scribbly wander
        const ta = angTo(last.x, last.y, v.target.x, v.target.y);
        v.a = approachAngle(v.a, ta, 0.14) + rnd(-0.28, 0.28);
        const nx = last.x + Math.cos(v.a) * 14;
        const ny = last.y + Math.sin(v.a) * 14;
        v.pts.push({ x: nx, y: ny });

        if (dist(nx, ny, v.target.x, v.target.y) < 24 ||
            nx < -40 || nx > this.w + 40 || ny < -40 || ny > this.h + 40 ||
            v.pts.length > 70) {
          v.done = true;
        }
      }
      if (v.done) growing--;
    }

    if (this.age >= this.life) this.finish();
  }

  drawVine(ctx, v) {
    const s = v.seed;
    // thorny outer stroke
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 11;
    ctx.lineJoin = 'round';
    roughPath(ctx, v.pts, s, 3);
    // white core
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    roughPath(ctx, v.pts, s + 3, 2.5);

    // thorns every 2nd point
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.2;
    for (let i = 2; i < v.pts.length - 1; i += 2) {
      const p = v.pts[i], q = v.pts[i + 1];
      const a = angTo(p.x, p.y, q.x, q.y) + (i % 4 === 0 ? 1.25 : -1.25);
      const tl = 11 + (i % 3) * 3;
      roughLine(ctx, p.x, p.y, p.x + Math.cos(a) * tl, p.y + Math.sin(a) * tl, s + i * 7, 2);
    }

    // growing head
    if (!v.done) {
      const p = v.pts[v.pts.length - 1];
      roughCirclePath(ctx, p.x, p.y, 7, s + 41, 0.3, 8);
      ctx.fillStyle = '#000';
      ctx.fill();
    }
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    for (const v of this.vines) this.drawVine(ctx, v);
  }

  hitTest(x, y) {
    for (const v of this.vines) {
      if (distToPolyline(x, y, v.pts) < 9) return true;
    }
    return false;
  }
}
