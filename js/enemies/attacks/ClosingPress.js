'use strict';

/* ============================================================
   19. CLOSING PRESS — two hatched walls slide in from the
   sides with moving gap windows, squeezing the safe space.
   ============================================================ */

class ClosingPressAttack extends Enemy {
  static type = 'press';
  static family = 'field';

  init(params) {
    super.init(params);
    this.life = Math.max(6.5, 9 - (this.diff - 1) * 0.35);
    this.maxIn = this.w * 0.24;
    this.speed = 1.35 + (this.diff - 1) * 0.12;
    // variant: 0 = both sides, 1 = one-sided press
    const v = params.variant | 0;
    this.walls = v === 1
      ? [{ side: chance(0.5) ? -1 : 1, gap: this.newGap(), lastOut: true }]
      : [{ side: -1, gap: this.newGap(), lastOut: true },
         { side: 1, gap: this.newGap(), lastOut: true }];
    this.label = 'CLOSING PRESS';
  }

  newGap() {
    const gh = rnd(0.17, 0.27) * this.h;
    return { y0: rnd(0.06, 0.94 - 0.27) * this.h, h: gh };
  }

  offset(age, phaseShift) {
    // smooth slide in and out
    const t = Math.sin((age + phaseShift) * this.speed);
    return (0.5 - 0.5 * t) * this.maxIn;
  }

  update(dt) {
    super.update(dt);
    for (let i = 0; i < this.walls.length; i++) {
      const w2 = this.walls[i];
      const off = this.offset(this.age, i * 2.1);
      const out = off < 4;
      if (out && !w2.lastOut) {
        // fully open again: new window
        w2.gap = this.newGap();
      }
      w2.lastOut = out;
      w2.off = off;
    }
    if (CLOCK.frame % 5 === 0 && this.walls[0].off > 6) {
      this.game.bullets.spawnParticle({
        x: this.walls[0].side < 0 ? this.walls[0].off : this.w - this.walls[0].off,
        y: rnd(0.1, 0.9) * this.h,
        vx: rnd(-30, 30), vy: rnd(-30, 30),
        life: 0.4, size: rnd(1.5, 3.5), g: rint(120, 190), drag: 4
      });
    }
    if (this.age >= this.life) this.finish();
  }

  inGap(wall, y) {
    return y > wall.gap.y0 && y < wall.gap.y0 + wall.gap.h;
  }

  drawWall(ctx, wall, idx) {
    const off = wall.off || 0;
    if (off < 3) return;
    const s = this.seed + idx * 31;
    const x = wall.side < 0 ? 0 : this.w - off;
    const y = 0, wdt = off, hgt = this.h;

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.fillRect(x, y, wdt, hgt);
    // hatch only outside the gap — one tiled pattern fill instead of
    // hundreds of marker strokes (this attack was the frame-time hog)
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, wdt, wall.gap.y0);
    ctx.rect(x, wall.gap.y0 + wall.gap.h, wdt, hgt - wall.gap.y0 - wall.gap.h);
    ctx.clip();
    ctx.save();
    const drift = (CLOCK.tick9 * 4.3) % 9;   // the hatch still creeps at 9 FPS
    ctx.translate(wall.side < 0 ? drift : -drift, 0);
    ctx.fillStyle = hatchPattern('rgba(0,0,0,0.65)', 2.4, 9, wall.side > 0);
    ctx.fillRect(x - 9, y, wdt + 18, hgt);   // padded so drift never uncovers the wall
    ctx.restore();
    ctx.restore();

    // rough edges
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    roughRect(ctx, x, y, wdt, hgt, s + 3, 3);
    const edgeX = wall.side < 0 ? off : this.w - off;
    roughLine(ctx, edgeX, 0, edgeX, this.h, s + 7, 4);

    // gap window markers: white notch + arrows
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, wall.gap.y0, wdt, wall.gap.h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    const gy0 = wall.gap.y0, gy1 = wall.gap.y0 + wall.gap.h;
    roughLine(ctx, edgeX, gy0, edgeX + wall.side * -26, gy0, s + 11, 3);
    roughLine(ctx, edgeX, gy1, edgeX + wall.side * -26, gy1, s + 13, 3);
    // chevrons pointing into the safe window
    const cy = (gy0 + gy1) / 2;
    for (let k = 0; k < 2; k++) {
      const ax = edgeX - wall.side * -(14 + k * 16);
      roughLine(ctx, ax, cy - 9, ax + wall.side * 12, cy, s + 17 + k, 2.5);
      roughLine(ctx, ax, cy + 9, ax + wall.side * 12, cy, s + 19 + k, 2.5);
    }
    ctx.restore();
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    for (let i = 0; i < this.walls.length; i++) this.drawWall(ctx, this.walls[i], i);
  }

  hitTest(x, y) {
    for (const wall of this.walls) {
      const off = wall.off || 0;
      if (off < 3) continue;
      const inside = wall.side < 0 ? x < off : x > this.w - off;
      if (inside && !this.inGap(wall, y)) return true;
    }
    return false;
  }
}
