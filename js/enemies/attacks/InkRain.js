'use strict';

/* ============================================================
   4. MARKER RAIN — huge absurd ink drops slam down from the
   top of the sheet at breakneck speed.
   ============================================================ */

class InkRainAttack extends Enemy {
  static type = 'rain';
  static family = 'bullet';

  init(params) {
    super.init(params);
    this.duration = params.duration || Math.min(9, 5 + this.diff * 0.6);
    // variant: 0 = vertical downpour, 1 = windy monsoon, 2 = short storm burst
    this.variant = params.variant | 0;
    // density is intentionally 3x lower than the base version
    this.spawnT = 0.75;
    this.label = this.variant === 2 ? 'INK STORM' : 'INK RAIN';
  }

  update(dt) {
    super.update(dt);
    if (this.age < this.duration) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        // ~3x slower than before: one drop every 0.21–0.48 s
        this.spawnT = this.variant === 2 ? rnd(0.09, 0.16) : rnd(0.21, 0.48);
        this.dropOne();
        if (this.variant === 2) this.dropOne();   // storm: double-drop
      }
    } else {
      this.finish();
    }
  }

  dropOne() {
    const w = this.w;
    const r = rnd(13, 27);
    // monsoon: drops are pushed sideways by the wind
    const wind = this.variant === 1 ? rnd(-150, 150) : rnd(-45, 45);
    this.game.bullets.spawnBullet({
      x: rnd(20, w - 20),
      y: -40,
      vx: wind,
      vy: rnd(800, 1350),
      r,
      style: 'drop',
      behavior: 'sway',
      sway: this.variant === 1 ? rnd(30, 90) : rnd(40, 130),
      swayFreq: rnd(4, 9),
      swayPhase: rnd(TAU),
      trail: 1
    });
  }

  draw(ctx) {
    // the scribbled ink cloud the rain pours from
    ctx.save();
    ctx.lineCap = 'round';
    const y = -6;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = 5;
    const pts = [];
    for (let x = -20; x <= this.w + 20; x += 46) {
      pts.push({ x, y: y + wob(this.seed + x, 12) });
    }
    roughPath(ctx, pts, this.seed, 4);

    // hanging drips
    ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const x = (i + 0.5) * this.w / 9 + wob(this.seed + i * 7, 16);
      const l = 8 + hash1(this.seed + i * 3 + CLOCK.tick9 * 0.7) * 26;
      roughLine(ctx, x, y, x + wob(this.seed + i, 3), y + l, this.seed + i * 11, 1.6);
    }
    ctx.restore();
  }
}
