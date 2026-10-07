'use strict';

/* ============================================================
   22. CLOCKWORK — a giant doodle wall clock ticks away in the
   corner. Each time a hand sweeps past a quarter it STRIKES,
   hosing a fan of ink down the hand's line.
   Visual: twin alarm bells that ring on every strike, hatched
   rim shading, doodle numerals, hands that TICK at the game's
   9 FPS, a hatched warn-wedge under each hand as it nears the
   next quarter, and a burst of impact strokes on the strike.
   ============================================================ */

class ClockAttack extends Enemy {
  static type = 'clock';
  static family = 'field';

  init(params) {
    super.init(params);
    this.x = rnd(0.15, 0.85) * this.w;
    this.y = rnd(0.16, 0.64) * this.h;
    this.R = rnd(52, 74);
    this.dir = chance(0.5) ? 1 : -1;
    this.life = Math.max(7, 10.5 - (this.diff - 1) * 0.3);
    this.handA = rnd(TAU);            // fast strike hand
    this.handB = rnd(TAU);            // slow lazy hand
    this.sectorA = this.sectorOf(this.handA);
    this.sectorB = this.sectorOf(this.handB);
    this.strikeT = 0;                 // strike burst timer (visual only)
    this.strikeA = 0;
    this.strikeN = 0;
    this.label = 'CLOCKWORK';
  }

  sectorOf(a) { return Math.floor((((a % TAU) + TAU) % TAU) / (TAU / 4)); }

  update(dt) {
    super.update(dt);
    this.handA += this.dir * dt * 1.3;
    this.handB += this.dir * dt * 0.52;
    const sa = this.sectorOf(this.handA), sb = this.sectorOf(this.handB);
    if (sa !== this.sectorA) { this.sectorA = sa; this.strike(this.handA, 6); }
    if (sb !== this.sectorB) { this.sectorB = sb; this.strike(this.handB, 3); }
    if (this.strikeT > 0) this.strikeT = Math.max(0, this.strikeT - dt);
    if (this.age >= this.life) this.finish();
  }

  strike(baseA, n) {
    this.game.renderer.addShake(1.2);
    this.strikeT = 0.5;
    this.strikeA = baseA;
    this.strikeN = n;
    const edge = this.R + 8;
    const mx = this.x + Math.cos(baseA) * edge;
    const my = this.y + Math.sin(baseA) * edge;
    for (let i = 0; i < n; i++) {
      const a = baseA + (i - (n - 1) / 2) * 0.22;
      const sp = rnd(230, 310) + this.diff * 18;
      this.game.bullets.spawnBullet({
        x: mx, y: my,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rnd(4.5, 7.5), style: 'blob', behavior: 'straight', maxLife: 8
      });
    }
  }

  /** angle of the next quarter-boundary in the travel direction */
  nextBoundary(a) {
    const s = TAU / 4;
    return this.dir > 0 ? (Math.floor(a / s) + 1) * s : Math.floor(a / s) * s;
  }

  draw(ctx) {
    const seed = this.seed;
    const ring = this.strikeT > 0 ? this.strikeT / 0.5 : 0;   // 1 -> 0
    ctx.save();
    // the whole clock shudders on every strike
    if (ring > 0) ctx.translate(wob(seed + CLOCK.tick9 * 5, ring * 3), wob(seed + 71 + CLOCK.tick9 * 5, ring * 3));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // faint wall shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 4;
    roughCircle(ctx, this.x + 5, this.y + 7, this.R, seed + 3, 0.2, 18);

    // face
    roughCirclePath(ctx, this.x, this.y, this.R, seed + 7, 0.08, 20);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.4;
    ctx.stroke();

    // grey rim shading (a marker swipe along the lower-left rim)
    const shade = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * 0.32 + (i / 8) * Math.PI * 0.96;
      shade.push({ x: this.x + Math.cos(a) * this.R * 0.86, y: this.y + Math.sin(a) * this.R * 0.86 });
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 7;
    roughPath(ctx, shade, seed + 211, 1.6);

    // warn-wedge: hatched slice showing the quarter that is about to be struck
    for (const ang of [this.handA, this.handB]) {
      const nb = this.nextBoundary(ang);
      const gap = this.dir > 0 ? nb - ang : ang - nb;
      if (gap <= 0.01 || gap > 0.62) continue;
      const k = 1 - gap / 0.62;
      ctx.globalAlpha = 0.22 + 0.5 * k;
      ctx.fillStyle = hatchPattern('rgba(0,0,0,0.5)', 2.2, 8);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.arc(this.x, this.y, this.R - 3, Math.min(ang, nb), Math.max(ang, nb));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // twelve doodle ticks (quarters are numerals, not ticks)
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 12; i++) {
      if (i % 3 === 0) continue;
      const a = i * TAU / 12;
      const r1 = this.R * 0.82, r2 = this.R * 0.93;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      roughLine(ctx, this.x + Math.cos(a) * r1, this.y + Math.sin(a) * r1,
        this.x + Math.cos(a) * r2, this.y + Math.sin(a) * r2, seed + 31 + i * 5, 1.4);
    }
    // hand-written 12 / 3 / 6 / 9
    const num = (s, a, k) => doodleText(ctx, s, this.x + Math.cos(a) * this.R * 0.64,
      this.y + Math.sin(a) * this.R * 0.64, seed + k, this.R * 0.24,
      { color: 'rgba(0,0,0,0.85)', double: false });
    num('12', -Math.PI / 2, 191);
    num('3', 0, 197);
    num('6', Math.PI / 2, 199);
    num('9', Math.PI, 211);

    // hands — quantized to the 9 FPS tick so they visibly TICK
    const qa = this.dir * (1.3 / 9), qb = this.dir * (0.52 / 9);
    const aA = Math.floor(this.handA / qa) * qa;
    const aB = Math.floor(this.handB / qb) * qb;

    // slow hand: arrow tip + counterweight tail
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.4;
    const lenB = this.R * 0.6;
    roughLine(ctx, this.x, this.y, this.x + Math.cos(aB) * lenB, this.y + Math.sin(aB) * lenB, seed + 53, 2.2);
    roughLine(ctx, this.x - Math.cos(aB) * this.R * 0.16, this.y - Math.sin(aB) * this.R * 0.16,
      this.x + Math.cos(aB) * lenB, this.y + Math.sin(aB) * lenB, seed + 55, 2.4);
    roughLine(ctx, this.x + Math.cos(aB) * lenB, this.y + Math.sin(aB) * lenB,
      this.x + Math.cos(aB - 0.42) * (lenB - 11), this.y + Math.sin(aB - 0.42) * (lenB - 11), seed + 57, 1.6);
    roughLine(ctx, this.x + Math.cos(aB) * lenB, this.y + Math.sin(aB) * lenB,
      this.x + Math.cos(aB + 0.42) * (lenB - 11), this.y + Math.sin(aB + 0.42) * (lenB - 11), seed + 59, 1.6);
    roughCirclePath(ctx, this.x - Math.cos(aB) * this.R * 0.16, this.y - Math.sin(aB) * this.R * 0.16, 4.5, seed + 61, 0.3, 8);
    ctx.fillStyle = '#000';
    ctx.fill();

    // fast strike hand: thin + arrow tip
    ctx.lineWidth = 2.6;
    const lenA = this.R * 0.88;
    roughLine(ctx, this.x, this.y, this.x + Math.cos(aA) * lenA, this.y + Math.sin(aA) * lenA, seed + 61, 2.4);
    roughLine(ctx, this.x + Math.cos(aA) * lenA, this.y + Math.sin(aA) * lenA,
      this.x + Math.cos(aA - 0.38) * (lenA - 10), this.y + Math.sin(aA - 0.38) * (lenA - 10), seed + 63, 1.6);
    roughLine(ctx, this.x + Math.cos(aA) * lenA, this.y + Math.sin(aA) * lenA,
      this.x + Math.cos(aA + 0.38) * (lenA - 10), this.y + Math.sin(aA + 0.38) * (lenA - 10), seed + 65, 1.6);

    // hub
    roughCirclePath(ctx, this.x, this.y, 4.5, seed + 79, 0.3, 8);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.6;
    roughCircle(ctx, this.x, this.y, 8, seed + 81, 0.2, 8);

    // ---- twin alarm bells on top ----
    const bell = (ba, bs) => {
      const wobble = ring > 0 ? wob(seed + bs + CLOCK.tick9 * 3, ring * 4) : 0;
      const bx = this.x + Math.cos(ba) * this.R + wobble;
      const by = this.y + Math.sin(ba) * this.R;
      const br = this.R * 0.22;
      roughCirclePath(ctx, bx, by, br, seed + bs, 0.18, 12);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.stroke();
      // flat base plate
      ctx.lineWidth = 3;
      roughLine(ctx, bx - br, by + br * 0.55, bx + br, by + br * 0.55, seed + bs + 5, 2);
      // knob
      roughCirclePath(ctx, bx, by - br - 3, 3.4, seed + bs + 9, 0.3, 8);
      ctx.fillStyle = '#000';
      ctx.fill();
      // ringing motion arcs
      if (ring > 0.05) {
        ctx.strokeStyle = `rgba(0,0,0,${(ring * 0.7).toFixed(2)})`;
        ctx.lineWidth = 2;
        const sgn = ba < -Math.PI / 2 ? -1 : 1;
        roughLine(ctx, bx + sgn * (br + 5), by - br * 0.6, bx + sgn * (br + 13), by - br * 0.1, seed + bs + 13, 2);
        roughLine(ctx, bx + sgn * (br + 4), by + br * 0.2, bx + sgn * (br + 11), by + br * 0.7, seed + bs + 15, 2);
      }
    };
    bell(-Math.PI / 2 - 0.62, 301);
    bell(-Math.PI / 2 + 0.62, 307);
    // striker mallet between the bells
    const mlt = ring > 0 ? wob(seed + 313 + CLOCK.tick9 * 3, ring * 5) : 0;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    roughLine(ctx, this.x + mlt, this.y - this.R - 2, this.x + mlt * 1.6, this.y - this.R - 14, seed + 311, 1.6);
    roughCirclePath(ctx, this.x + mlt * 1.6, this.y - this.R - 17, 4, seed + 315, 0.3, 8);
    ctx.fillStyle = '#000';
    ctx.fill();

    // ---- strike burst: impact strokes fanned down the hand's line ----
    if (ring > 0) {
      ctx.globalAlpha = ring;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      const n = 4 + this.strikeN;
      for (let i = 0; i < n; i++) {
        const a = this.strikeA + (i - (n - 1) / 2) * 0.17 + wob(seed + i * 7, 0.05);
        const r1 = this.R + 6 + (1 - ring) * 16, r2 = r1 + 14 + ring * 24;
        roughLine(ctx, this.x + Math.cos(a) * r1, this.y + Math.sin(a) * r1,
          this.x + Math.cos(a) * r2, this.y + Math.sin(a) * r2, seed + i * 11, 2.4);
      }
      // dashed shock arc over the struck side
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.R + 14 + (1 - ring) * 10, this.strikeA - 0.75, this.strikeA + 0.75);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  hitTest(x, y) {
    return dist(x, y, this.x, this.y) < this.R * 0.98;
  }
}
