'use strict';

/* ============================================================
   9. CRAZY SCISSORS — a giant doodle scissors object rips
   across the sheet with chaotic cutting movements.
   ============================================================ */

class CrazyScissorsAttack extends Enemy {
  static type = 'scissors';
  static family = 'chase';

  init(params) {
    super.init(params);
    this.dir = chance(0.5) ? 1 : -1;
    this.speed = rnd(380, 540);
    this.x0 = this.dir > 0 ? -320 : this.w + 320;
    this.y0 = rnd(0.2, 0.8) * this.h;
    this.blade = rnd(180, 250);
    this.width = 15;
    this.life = Math.max(4, (this.w + 700) / this.speed);
    this.label = 'CRAZY SCISSORS';
  }

  geom() {
    const t = this.age;
    const x = this.x0 + this.dir * this.speed * t;
    const y = this.y0 + Math.sin(t * 2.6) * this.h * 0.17 + Math.sin(t * 7.3) * 26;
    const base = this.dir > 0 ? 0 : Math.PI;
    const rot = base + Math.sin(t * 3.4) * 0.55;
    const chomp = 0.14 + Math.abs(Math.sin(t * 5.4)) * 0.6; // blades open/close
    const a1 = rot - chomp, a2 = rot + chomp;
    return {
      x, y, rot, a1, a2,
      b1: { x: x + Math.cos(a1) * this.blade, y: y + Math.sin(a1) * this.blade },
      b2: { x: x + Math.cos(a2) * this.blade, y: y + Math.sin(a2) * this.blade },
      h1: { x: x - Math.cos(a1 - 0.45) * 90, y: y - Math.sin(a1 - 0.45) * 90 },
      h2: { x: x - Math.cos(a2 + 0.45) * 90, y: y - Math.sin(a2 + 0.45) * 90 }
    };
  }

  update(dt) {
    super.update(dt);
    const g = this.geom();

    // ink flecks fly off the cut
    if (CLOCK.frame % 2 === 0) {
      this.game.bullets.spawnParticle({
        x: g.x + rnd(-20, 20), y: g.y + rnd(-20, 20),
        vx: rnd(-70, 70) - this.dir * 60, vy: rnd(-70, 70),
        life: 0.5, size: rnd(1.5, 4.5), g: rint(80, 170), drag: 3
      });
    }

    if (this.age >= this.life) this.finish();
  }

  drawBlade(ctx, g, from, to, seed) {
    // long scribbly blade shape
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const wide = 16;

    ctx.beginPath();
    ctx.moveTo(from.x + nx * wide + wob(seed, 3), from.y + ny * wide + wob(seed + 1, 3));
    ctx.lineTo(from.x + nx * 4 + wob(seed + 3, 4), from.y + ny * 4 + wob(seed + 4, 4));
    ctx.lineTo(to.x + wob(seed + 5, 3), to.y + wob(seed + 6, 3));
    ctx.lineTo(from.x - nx * wide + wob(seed + 7, 3), from.y - ny * wide + wob(seed + 8, 3));
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.stroke();

    // blade hatching
    ctx.save();
    ctx.clip();
    hatchRect(ctx, to.x - 80, to.y - 80, 160, 160, 9, seed + 21, {
      angle: g.rot, color: 'rgba(0,0,0,0.55)', width: 2, amp: 2
    });
    ctx.restore();
  }

  draw(ctx) {
    const g = this.geom();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // speed streaks behind
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      const off = i * 34;
      roughLine(ctx,
        g.x - this.dir * 120, g.y + off,
        g.x - this.dir * 300, g.y + off + wob(this.seed + i, 20),
        this.seed + i * 7, 4);
    }

    this.drawBlade(ctx, g, g, g.b1, this.seed);
    this.drawBlade(ctx, g, g, g.b2, this.seed + 40);

    // handles (two loops)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 9;
    roughCircle(ctx, g.h1.x, g.h1.y, 27, this.seed + 61, 0.2, 14);
    roughCircle(ctx, g.h2.x, g.h2.y, 27, this.seed + 67, 0.2, 14);

    // pivot screw
    roughCirclePath(ctx, g.x, g.y, 15, this.seed + 71, 0.25, 12);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.6;
    roughLine(ctx, g.x - 8, g.y, g.x + 8, g.y, this.seed + 73, 2);
    roughLine(ctx, g.x, g.y - 8, g.x, g.y + 8, this.seed + 75, 2);
  }

  hitTest(x, y) {
    if (this.age >= this.life) return false;
    const g = this.geom();
    if (dist(x, y, g.x, g.y) < 24) return true;
    if (pointSegDist(x, y, g.x, g.y, g.b1.x, g.b1.y) < this.width) return true;
    if (pointSegDist(x, y, g.x, g.y, g.b2.x, g.b2.y) < this.width) return true;
    if (dist(x, y, g.h1.x, g.h1.y) < 30) return true;
    if (dist(x, y, g.h2.x, g.h2.y) < 30) return true;
    return false;
  }
}
