'use strict';

/* ============================================================
   10. AXIS GRID — the sheet is sharply ruled with a technical
   marker grid; random cells instantly fill with lethal hatching
   (toggled in strict 9-FPS steps).
   ============================================================ */

class AxisGridAttack extends Enemy {
  static type = 'grid';
  static family = 'field';

  init(params) {
    super.init(params);
    this.cols = rint(8, 12);
    this.rows = rint(6, 9);
    this.cw = this.w / this.cols;
    this.ch = this.h / this.rows;
    this.tDraw = 0.7;
    this.tActive = Math.max(2.6, 3.6 - (this.diff - 1) * 0.05);
    this.tFade = 0.5;
    this.phase = 'draw';

    // ~42% of cells are condemned
    this.deadly = new Set();
    const total = this.cols * this.rows;
    const want = Math.round(total * 0.42);
    while (this.deadly.size < want) this.deadly.add(rint(0, total - 1));

    this.label = 'AXIS GRID';
  }

  update(dt) {
    super.update(dt);
    if (this.phase === 'draw' && this.age >= this.tDraw) this.phase = 'active';
    else if (this.phase === 'active' && this.age >= this.tDraw + this.tActive) this.phase = 'fade';
    else if (this.phase === 'fade' && this.age >= this.tDraw + this.tActive + this.tFade) this.finish();
  }

  cellOn(ci) {
    if (this.phase !== 'active' && this.phase !== 'fade') return false;
    if (!this.deadly.has(ci)) return false;
    // strict 9-FPS flicker: cells snap in and out
    return hash1(ci * 3.71 + CLOCK.tick9 * 0.9137) > (this.phase === 'fade' ? 0.75 : 0.52);
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    const alpha = this.phase === 'fade'
      ? clamp(1 - (this.age - this.tDraw - this.tActive) / this.tFade, 0, 1)
      : 1;
    const reveal = this.phase === 'draw' ? clamp(this.age / this.tDraw, 0, 1) : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    // hatched lethal cells (under the lines)
    if (this.phase !== 'draw') {
      for (let i = 0; i < this.cols; i++) {
        if (i / this.cols > reveal) break;
        for (let j = 0; j < this.rows; j++) {
          const ci = j * this.cols + i;
          if (!this.cellOn(ci)) continue;
          const x = i * this.cw, y = j * this.ch;
          hatchRect(ctx, x, y, this.cw, this.ch, 7, this.seed + ci * 5, {
            angle: (ci % 2 ? 0.78 : -0.78),
            color: '#000',
            width: 2.4,
            amp: 1.8,
            offset: (CLOCK.tick9 * 3.7) % 7
          });
          ctx.strokeStyle = 'rgba(0,0,0,0.9)';
          ctx.lineWidth = 4;
          roughRect(ctx, x, y, this.cw, this.ch, this.seed + ci, 2.4);
        }
      }
    }

    // the ruled axes
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= this.cols; i++) {
      if (i / this.cols > reveal) break;
      const x = i * this.cw;
      roughLine(ctx, x, 0, x, this.h, this.seed + i * 3, 2);
    }
    for (let j = 0; j <= this.rows; j++) {
      if (j / this.rows > reveal) break;
      const y = j * this.ch;
      roughLine(ctx, 0, y, this.w, y, this.seed + 500 + j * 3, 2);
    }

    // technical ticks + numbers
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= this.cols; i++) {
      if (i / this.cols > reveal) break;
      const x = i * this.cw;
      roughLine(ctx, x - 5, 0, x + 5, 8, this.seed + i * 7, 1.2);
      roughLine(ctx, x - 5, this.h, x + 5, this.h - 8, this.seed + i * 11, 1.2);
    }
    doodleText(ctx, 'X — AXIS / ' + this.cols + 'x' + this.rows, this.w - 14, 16, this.seed + 91, 15, {
      align: 'right', color: 'rgba(0,0,0,0.5)', double: false
    });

    ctx.restore();
  }

  hitTest(x, y) {
    if (this.phase === 'draw') return false;
    const i = Math.floor(x / this.cw);
    const j = Math.floor(y / this.ch);
    if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) return false;
    return this.cellOn(j * this.cols + i);
  }
}
