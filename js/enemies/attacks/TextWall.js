'use strict';

/* ============================================================
   8. TEXT / CODE WALL — rows of broken letters fly across the
   sheet like a horizontal curtain, leaving rare gaps.
   ============================================================ */

const CODE_CHARS = '01<>{}[]#%@&*H3LL!?/;=+~-';

class TextWallAttack extends Enemy {
  static type = 'wall';
  static family = 'bullet';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    this.charW = rnd(26, 33);
    this.rows = [];
    // NERF: fewer rows
    const n = clamp(Math.round(h / 68), 4, 9);
    // NERF: shorter presence
    this.duration = params.duration || Math.min(7, 5 + this.diff * 0.3);

    const v = params.variant | 0;
    for (let i = 0; i < n; i++) {
      // variant: 0 = mixed rows, 1 = whole wall sweeps one way, 2 = walls from both sides
      let dir;
      if (v === 1) dir = 1;
      else if (v === 2) dir = i % 2 === 0 ? 1 : -1;
      else dir = chance(0.5) ? 1 : -1;
      const row = {
        y: (i + 0.5) * (h / n) + rnd(-8, 8),
        dir,
        // NERF: much slower rows
        speed: rnd(150, 290),
        x: 0,
        chars: [],
        gapStart: 0,
        gapLen: 0,
        seed: rnd(1000)
      };
      this.buildRow(row, true);
      this.rows.push(row);
    }
    this.label = v === 2 ? 'DOUBLE WALL' : 'TEXT WALL';
  }

  buildRow(row, initial = false) {
    const w = this.w;
    const len = Math.ceil(w / this.charW) + 7;
    row.chars = [];
    for (let i = 0; i < len; i++) row.chars.push(CODE_CHARS[rint(0, CODE_CHARS.length - 1)]);
    row.gapStart = rint(4, len - 8);
    // NERF: wider safe windows
    row.gapLen = rint(3, 5);
    row.x = row.dir > 0 ? -len * this.charW : (initial ? rnd(-this.w * 0.4, this.w) : this.w);
  }

  update(dt) {
    super.update(dt);
    const w = this.w;
    for (const row of this.rows) {
      row.x += row.dir * row.speed * dt;
      const span = row.chars.length * this.charW;
      if (row.dir > 0 && row.x > w + 40) this.buildRow(row);
      if (row.dir < 0 && row.x + span < -40) this.buildRow(row);
    }
    if (this.age >= this.duration) this.finish();
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    const cw = this.charW;
    for (const row of this.rows) {
      for (let i = 0; i < row.chars.length; i++) {
        if (i >= row.gapStart && i < row.gapStart + row.gapLen) continue;
        const sx = row.x + i * cw;
        if (sx < -50 || sx > this.w + 50) continue;
        const ch = row.chars[i];
        const grey = i % 9 === 0;
        doodleText(ctx, ch, sx + cw / 2, row.y, row.seed + i * 7, 32, {
          color: grey ? 'rgba(0,0,0,0.45)' : '#000',
          double: i % 3 === 0
        });
      }
      // little marks pointing at the safe window
      const gx = row.x + (row.gapStart + row.gapLen / 2) * cw;
      if (gx > 0 && gx < this.w) {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        const d = row.dir;
        roughLine(ctx, gx - 16 * d, row.y - 22, gx, row.y - 22, row.seed + 3, 1.5);
        roughLine(ctx, gx, row.y - 22, gx - 7 * d, row.y - 27, row.seed + 5, 1.5);
        roughLine(ctx, gx, row.y - 22, gx - 7 * d, row.y - 17, row.seed + 7, 1.5);
      }
    }
  }

  hitTest(x, y) {
    const cw = this.charW;
    for (const row of this.rows) {
      if (y < row.y - 19 || y > row.y + 19) continue;
      const i = Math.floor((x - row.x) / cw);
      if (i < 0 || i >= row.chars.length) continue;
      if (i >= row.gapStart && i < row.gapStart + row.gapLen) continue;
      const sx = row.x + i * cw;
      if (x >= sx + 2 && x <= sx + cw * 0.9) return true;
    }
    return false;
  }
}
