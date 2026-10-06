'use strict';

/* ============================================================
   17. FALLING BLOCKS — hatched doodle slabs are telegraphed,
   slam down and send horizontal shockwaves across the sheet.
   ============================================================ */

class FallingBlocksAttack extends Enemy {
  static type = 'anvil';
  static family = 'bullet';

  init(params) {
    super.init(params);
    this.life = 7;
    this.spawnT = 0.3;
    this.blocks = [];
    this.shocks = [];
    this.label = 'FALLING BLOCKS';
  }

  spawnBlock() {
    const w = this.w, h = this.h;
    const bw = rnd(75, 135);
    this.blocks.push({
      x: rnd(0.06, 0.94) * w,
      y: -100,
      w: bw,
      h: rnd(50, 92),
      targetY: rnd(0.35, 0.82) * h,
      vy: rnd(900, 1300),
      phase: 'warn',
      t: 0.5,
      seed: rnd(1000)
    });
  }

  slam(b) {
    b.phase = 'slam';
    b.t = 0.7;
    b.y = b.targetY;
    this.game.renderer.addShake(9);
    this.game.renderer.addFlash(0.1);
    // two horizontal shock lines
    for (const dir of [-1, 1]) {
      this.shocks.push({ x: b.x + dir * b.w / 2, y: b.y + b.h / 2, dir, len: 0, t: 0.7, seed: rnd(1000) });
    }
    this.game.bullets.burst(b.x, b.y + b.h / 2, 26, { s0: 120, s1: 520, life: 0.8, size: 5, g: rint(60, 160), drag: 3 });
  }

  update(dt) {
    super.update(dt);

    if (this.age < this.life) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = rnd(0.75, 1.15);
        this.spawnBlock();
      }
    }

    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const b = this.blocks[i];
      b.t -= dt;
      if (b.phase === 'warn' && b.t <= 0) { b.phase = 'fall'; b.t = 99; }
      else if (b.phase === 'fall') {
        b.vy += 2200 * dt;
        b.y += b.vy * dt;
        if (b.y >= b.targetY) this.slam(b);
      } else if (b.phase === 'slam' && b.t <= 0) {
        this.blocks.splice(i, 1);
      }
    }

    for (let i = this.shocks.length - 1; i >= 0; i--) {
      const s = this.shocks[i];
      s.t -= dt;
      s.len += 1500 * dt;
      if (s.t <= 0) this.shocks.splice(i, 1);
    }

    if (this.age >= this.life && !this.blocks.length && !this.shocks.length) this.finish();
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const b of this.blocks) {
      if (b.phase === 'warn') {
        // dashed guide + landing mark
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        roughRect(ctx, b.x - b.w / 2, -20, b.w, b.targetY + 30, b.seed, 4);
        ctx.setLineDash([]);
        ctx.setLineDash([7, 6]);
        roughLine(ctx, b.x - b.w / 2 - 14, b.targetY, b.x + b.w / 2 + 14, b.targetY, b.seed + 3, 3);
        ctx.setLineDash([]);
        continue;
      }

      const x = b.x - b.w / 2, y = b.y;
      if (b.phase === 'fall') {
        // speed streaks
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 3;
        for (let i = -1; i <= 1; i++) {
          roughLine(ctx, b.x + i * b.w * 0.3, y - 20, b.x + i * b.w * 0.3, y - 90, b.seed + i, 4);
        }
      }

      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, b.w, b.h);
      hatchRect(ctx, x, y, b.w, b.h, 8, b.seed + 7, {
        angle: (b.seed | 0) % 2 ? 0.8 : -0.8,
        color: 'rgba(0,0,0,0.75)',
        width: 2.4,
        amp: 1.8
      });
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 5;
      roughRect(ctx, x, y, b.w, b.h, b.seed, 3);
    }

    for (const s of this.shocks) {
      const ex = s.x + s.dir * s.len;
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 26;
      roughLine(ctx, s.x, s.y, ex, s.y, s.seed, 5);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 10;
      roughLine(ctx, s.x, s.y, ex, s.y, s.seed + 3, 5);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.5;
      roughLine(ctx, s.x, s.y, ex, s.y, s.seed + 7, 4);
    }
  }

  hitTest(x, y) {
    for (const b of this.blocks) {
      if (b.phase === 'warn') continue;
      if (x > b.x - b.w / 2 + 3 && x < b.x + b.w / 2 - 3 &&
          y > b.y + 3 && y < b.y + b.h - 3) return true;
    }
    for (const s of this.shocks) {
      const ex = s.x + s.dir * s.len;
      const lo = Math.min(s.x, ex), hi = Math.max(s.x, ex);
      if (x >= lo && x <= hi && Math.abs(y - s.y) < 9) return true;
    }
    return false;
  }
}
