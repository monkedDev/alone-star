'use strict';

/* ============================================================
   15. ORBITING SAWS — doodle circular saws spin around a
   drifting knot and sweep across the whole sheet.
   ============================================================ */

class OrbitingSawsAttack extends Enemy {
  static type = 'saws';
  static family = 'entity';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    this.cx = rnd(0.3, 0.7) * w;
    this.cy = rnd(0.3, 0.7) * h;
    this.driftA = rnd(TAU);
    this.orbitR = rnd(95, 165);
    this.spin = rnd(2.2, 3.6) * (chance(0.5) ? 1 : -1);
    this.count = Math.max(1, params.count || 2);
    this.saws = [];
    for (let i = 0; i < this.count; i++) {
      this.saws.push({ a: i * TAU / this.count, r: this.orbitR * (1 + i * 0.12), size: rnd(22, 30) });
    }
    this.life = Math.max(6.5, 9.5 - (this.diff - 1) * 0.3);
    this.label = 'ORBITING SAWS';
  }

  update(dt) {
    super.update(dt);
    this.driftA += dt * 0.8;
    this.cx += Math.cos(this.driftA) * 90 * dt;
    this.cy += Math.sin(this.driftA * 1.31) * 90 * dt;
    const m = this.orbitR + 60;
    this.cx = clamp(this.cx, m, this.w - m);
    this.cy = clamp(this.cy, m, this.h - m);

    for (const s of this.saws) s.a += this.spin * dt;

    if (CLOCK.frame % 3 === 0) {
      const s = this.saws[0];
      const x = this.cx + Math.cos(s.a) * s.r;
      const y = this.cy + Math.sin(s.a) * s.r;
      this.game.bullets.spawnParticle({
        x, y, vx: rnd(-30, 30), vy: rnd(-30, 30),
        life: 0.4, size: rnd(1.5, 3.5), g: rint(130, 200), drag: 4
      });
    }

    if (this.age >= this.life) this.finish();
  }

  sawPos(s) {
    return { x: this.cx + Math.cos(s.a) * s.r, y: this.cy + Math.sin(s.a) * s.r };
  }

  drawSaw(ctx, s, i) {
    const p = this.sawPos(s);
    const r = s.size;
    const rot = s.a * 3;

    // teeth ring
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(rot);
    ctx.beginPath();
    const teeth = 10;
    for (let k = 0; k < teeth * 2; k++) {
      const a = k / (teeth * 2) * TAU;
      const rr = k % 2 === 0 ? r * 1.45 : r;
      const x = Math.cos(a) * rr + wob(this.seed + k * 3, 1.6);
      const y = Math.sin(a) * rr + wob(this.seed + k * 5, 1.6);
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.4;
    ctx.stroke();

    // hatched inner disc
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, TAU);
    ctx.clip();
    hatchRect(ctx, -r, -r, r * 2, r * 2, 6, this.seed + i * 17, {
      angle: 0.8, color: 'rgba(0,0,0,0.7)', width: 2, amp: 1.4
    });
    ctx.restore();

    // bolt
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, TAU);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    // tether lines
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 7]);
    for (const s of this.saws) {
      const p = this.sawPos(s);
      roughLine(ctx, this.cx, this.cy, p.x, p.y, this.seed + s.r, 3);
    }
    ctx.setLineDash([]);

    // centre knot
    roughCirclePath(ctx, this.cx, this.cy, 12, this.seed + 3, 0.3, 10);
    ctx.fillStyle = '#000';
    ctx.fill();

    for (let i = 0; i < this.saws.length; i++) this.drawSaw(ctx, this.saws[i], i);
  }

  hitTest(x, y) {
    for (const s of this.saws) {
      const p = this.sawPos(s);
      if (dist(x, y, p.x, p.y) < s.size * 1.3) return true;
    }
    return false;
  }
}
