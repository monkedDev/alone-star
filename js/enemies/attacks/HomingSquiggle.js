'use strict';

/* ============================================================
   7. HOMING SQUIGGLES — slow but relentless doodle snakes that
   crawl straight after the star.
   ============================================================ */

class HomingSquiggleAttack extends Enemy {
  static type = 'snake';
  static family = 'chase';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    const count = Math.max(1, params.count || 1);
    this.snakes = [];
    for (let i = 0; i < count; i++) {
      const side = rint(0, 3);
      const hx = side === 0 ? rnd(w) : side === 1 ? w - 30 : side === 2 ? rnd(w) : 30;
      const hy = side === 0 ? 30 : side === 1 ? rnd(h) : side === 2 ? h - 30 : rnd(h);
      const segs = [];
      for (let s = 0; s < 18; s++) segs.push({ x: hx, y: hy });
      this.snakes.push({
        hx, hy,
        a: rnd(TAU),
        speed: rnd(125, 155) + this.diff * 6,
        segs,
        seed: rnd(1000)
      });
    }
    this.life = Math.max(8, 12 - (this.diff - 1) * 0.2);
    this.label = 'HOMING SQUIGGLES';
  }

  update(dt) {
    super.update(dt);
    const p = this.game.player;
    const w = this.w, h = this.h;

    for (const s of this.snakes) {
      if (p.alive) {
        const target = angTo(s.hx, s.hy, p.x, p.y);
        s.a = approachAngle(s.a, target, 2.6 * dt);
      }
      s.hx += Math.cos(s.a) * s.speed * dt;
      s.hy += Math.sin(s.a) * s.speed * dt;

      // bounce off the sheet edges
      if (s.hx < 20) { s.hx = 20; s.a = approachAngle(s.a, Math.PI - s.a, Math.PI); }
      if (s.hx > w - 20) { s.hx = w - 20; s.a = approachAngle(s.a, Math.PI - s.a, Math.PI); }
      if (s.hy < 20) { s.hy = 20; s.a = approachAngle(s.a, -s.a, Math.PI); }
      if (s.hy > h - 20) { s.hy = h - 20; s.a = approachAngle(s.a, -s.a, Math.PI); }

      // chain follow
      s.segs[0].x = s.hx;
      s.segs[0].y = s.hy;
      for (let i = 1; i < s.segs.length; i++) {
        const prev = s.segs[i - 1], cur = s.segs[i];
        const a = angTo(cur.x, cur.y, prev.x, prev.y);
        cur.x = prev.x - Math.cos(a) * 9;
        cur.y = prev.y - Math.sin(a) * 9;
      }
    }

    if (this.age >= this.life) this.finish();
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const s of this.snakes) {
      // wiggly body polyline (offset noise per segment)
      const pts = [];
      for (let i = 0; i < s.segs.length; i++) {
        const wobA = wob(s.seed + i * 3, 3.2);
        const per = s.a + Math.PI / 2;
        pts.push({
          x: s.segs[i].x + Math.cos(per) * wobA,
          y: s.segs[i].y + Math.sin(per) * wobA
        });
      }

      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 13;
      roughPath(ctx, pts, s.seed, 2.4);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 7;
      roughPath(ctx, pts, s.seed + 3, 2.4);

      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      roughPath(ctx, pts, s.seed + 6, 2);

      // head
      const hx = s.segs[0].x, hy = s.segs[0].y;
      roughCirclePath(ctx, hx, hy, 10, s.seed + 21, 0.22, 12);
      ctx.fillStyle = '#000';
      ctx.fill();

      // googly eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(hx + Math.cos(s.a + 1) * 4, hy + Math.sin(s.a + 1) * 4, 3.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + Math.cos(s.a - 1) * 4, hy + Math.sin(s.a - 1) * 4, 3.2, 0, TAU); ctx.fill();

      // forked tongue
      const tx = hx + Math.cos(s.a) * 12, ty = hy + Math.sin(s.a) * 12;
      const ex = hx + Math.cos(s.a) * 24, ey = hy + Math.sin(s.a) * 24;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      roughLine(ctx, tx, ty, ex, ey, s.seed + 33, 1.6);
      roughLine(ctx, ex, ey, ex + Math.cos(s.a + 0.5) * 7, ey + Math.sin(s.a + 0.5) * 7, s.seed + 35, 1.2);
      roughLine(ctx, ex, ey, ex + Math.cos(s.a - 0.5) * 7, ey + Math.sin(s.a - 0.5) * 7, s.seed + 37, 1.2);
    }
  }

  hitTest(x, y) {
    for (const s of this.snakes) {
      for (let i = 0; i < s.segs.length; i++) {
        if (dist(x, y, s.segs[i].x, s.segs[i].y) < 7.5) return true;
      }
    }
    return false;
  }
}
