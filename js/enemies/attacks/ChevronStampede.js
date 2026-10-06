'use strict';

/* ============================================================
   13. CHEVRON STAMPEDE — hand-drawn arrows rush across the
   sheet in tight rows with only a couple of gaps.
   ============================================================ */

class ChevronStampedeAttack extends Enemy {
  static type = 'arrows';
  static family = 'bullet';

  init(params) {
    super.init(params);
    this.life = params.duration || Math.min(7, 5.5 + this.diff * 0.3);
    this.waveT = 0.35;
    this.dir = chance(0.5) ? 1 : -1;
    this.gapStep = 0;
    // variant: 0 = classic rows, 1 = wide windows, 2 = double-fire salvos
    this.variant = params.variant | 0;
    if (this.variant === 2) this.waveT = 0.18;
    this.label = 'CHEVRON STAMPEDE';
  }

  spawnWave() {
    const w = this.w, h = this.h;
    const dir = this.dir;
    this.dir = -dir; // alternate sides
    const y = rnd(0.12, 0.88) * h;
    const step = 34;
    const count = Math.ceil(w / step) + 3;
    // variant: 1 leaves much bigger safe windows
    const gapLen = this.variant === 1 ? rint(4, 5) : rint(2, 3);
    const gapStart = rint(3, Math.max(4, count - 6));
    const speed = rnd(430, 600) + this.diff * 45;

    for (let i = 0; i < count; i++) {
      if (i >= gapStart && i < gapStart + gapLen) continue;
      const x = dir > 0 ? -step * (count - i) : w + step * i;
      this.game.bullets.spawnBullet({
        x, y: y + wob(this.seed + i * 3, 7),
        vx: dir * speed, vy: rnd(-14, 14),
        r: 11,
        style: 'chevron',
        behavior: 'straight'
      });
    }
    this.game.renderer.addShake(2.5);
    this.spawnSide = dir;
    this.spawnY = y;
  }

  update(dt) {
    super.update(dt);
    if (this.age < this.life) {
      this.waveT -= dt;
      if (this.waveT <= 0) {
        this.waveT = rnd(0.95, 1.35);
        this.spawnWave();
      }
    } else {
      this.finish();
    }
  }

  draw(ctx) {
    // edge marker showing where the next wave will come from
    ctx.save();
    ctx.lineCap = 'round';
    const dir = this.dir;
    const x = dir > 0 ? 14 : this.w - 14;
    const k = Math.floor((CLOCK.time * 3) % 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const y = (i + 0.5) * this.h / 5 + wob(this.seed + i, 10);
      const l = 26 + (i + k) % 3 * 12;
      roughLine(ctx, x, y, x + dir * l, y, this.seed + i * 5, 2.5);
      roughLine(ctx, x + dir * l, y, x + dir * (l - 12), y - 8, this.seed + i * 9, 2);
      roughLine(ctx, x + dir * l, y, x + dir * (l - 12), y + 8, this.seed + i * 13, 2);
    }
    ctx.restore();
  }
}
