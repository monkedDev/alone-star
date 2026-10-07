'use strict';

/* ============================================================
   25. INK CANNON — a sloppy doodle cannon mounts itself on a
   sheet edge. It aims at the star with a dashed sight line, then
   lobs heavy ink shells that arc over the page and splash.
   Visual: bolted edge-mount plate, rim lugs on the wheel, barrel
   recoil + muzzle flash + hanging ink drip while reloading, a
   dashed BALLISTIC ARC preview showing exactly where the shell
   will land, and a charge ring that closes as the shot comes.
   ============================================================ */

class CannonAttack extends Enemy {
  static type = 'cannon';
  static family = 'bullet';

  init(params) {
    super.init(params);
    this.side = chance(0.5) ? -1 : 1;
    this.y = rnd(0.25, 0.75) * this.h;
    this.R = 22;
    this.turn = chance(0.5) ? 1 : -1;       // wheel spin
    this.shots = 3 + (this.diff > 2.6 ? 1 : 0);
    this.shotN = 0;
    this.phase = 'aim';
    this.t = 0.7;                            // time to the first shot
    this.aimDur = this.t;                    // charge ring duration
    this.reloadDur = this.t;
    this.recoil = 0;                         // barrel kick (visual)
    this.flashT = 0;                         // muzzle flash timer (visual)
    this.target = { x: this.w / 2, y: this.h / 2 };
    this.label = 'INK CANNON';
  }

  get base() { return { x: this.side < 0 ? 26 : this.w - 26, y: this.y }; }
  get muzzle() {
    const b = this.base;
    return { x: b.x + this.side * 64, y: b.y };
  }

  update(dt) {
    super.update(dt);
    const p = this.game.player;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 6);
    if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt);

    if (this.phase === 'aim') {
      // the barrel chases the star while the sight line burns in
      if (p.alive) {
        this.target.x += (p.x - this.target.x) * Math.min(1, dt * 6);
        this.target.y += (p.y - this.target.y) * Math.min(1, dt * 6);
      }
      this.t -= dt;
      if (this.t <= 0) this.fire();
    } else if (this.phase === 'reload') {
      this.t -= dt;
      if (this.t <= 0) {
        if (this.shotN >= this.shots) {
          this.sparks(this.muzzle.x, this.muzzle.y, 16);
          this.finish();
          return;
        }
        this.phase = 'aim';
        this.t = Math.max(0.45, 0.7 - this.diff * 0.05);
        this.aimDur = this.t;
      }
    }
  }

  fire() {
    this.shotN++;
    const m = this.muzzle;
    this.fireFlash(6);
    this.game.renderer.addShake(5);
    this.recoil = 1;
    this.flashT = 0.16;
    // powder smoke
    this.game.bullets.burst(m.x, m.y, 8, { s0: 40, s1: 200, life: 0.4, size: 4, g: rint(40, 120) });
    const a = angTo(m.x, m.y, this.target.x, this.target.y) + rnd(-0.06, 0.06);
    const sp = rnd(380, 440);
    this.game.bullets.spawnBullet({
      x: m.x, y: m.y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: rnd(12, 15), style: 'drop', behavior: 'shard',
      spin: rnd(-3, 3), maxLife: 7
    });
    this.phase = 'reload';
    this.t = Math.max(0.5, 0.85 - this.diff * 0.06);
    this.reloadDur = this.t;
  }

  draw(ctx) {
    const seed = this.seed;
    const b = this.base, m = this.muzzle;
    const a = angTo(m.x, m.y, this.target.x, this.target.y);
    const t01 = this.phase === 'aim' ? clamp(1 - this.t / (this.aimDur || 0.7), 0, 1) : 0;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.phase === 'aim') {
      // ---- dashed sight line ----
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([7, 9]);
      ctx.lineDashOffset = -CLOCK.time * 60;
      const len = Math.min(520, dist(m.x, m.y, this.target.x, this.target.y));
      roughLine(ctx, m.x, m.y, m.x + Math.cos(a) * len, m.y + Math.sin(a) * len, seed + 3, 1.6);
      ctx.setLineDash([]);

      // ---- ballistic arc preview: where the shell will actually fly ----
      const sp = 410;
      let px = m.x, py = m.y;
      let vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
      const pts = [{ x: px, y: py }];
      let land = null;
      const stp = 0.06;
      for (let i = 0; i < 80; i++) {
        vy += 620 * stp;
        px += vx * stp;
        py += vy * stp;
        if (i % 2 === 0) pts.push({ x: px, y: py });
        if (px < -30 || px > this.w + 30 || py > this.h + 60) break;
        if (py >= this.h - 10) {
          land = { x: clamp(px, 12, this.w - 12), y: this.h - 10 };
          pts.push({ x: land.x, y: land.y });
          break;
        }
      }
      if (pts.length > 1) {
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 2;
        dashedPolyline(ctx, pts, 5, 9, seed + 51, 1.6, -CLOCK.time * 40);
      }
      // landing splash marker that closes in as the shot comes
      if (land) {
        const blink = 0.4 + 0.6 * t01;
        ctx.strokeStyle = `rgba(0,0,0,${blink.toFixed(2)})`;
        ctx.lineWidth = 2.4;
        roughLine(ctx, land.x - 11, land.y, land.x + 11, land.y, seed + 53, 1.6);
        roughLine(ctx, land.x, land.y - 11, land.x, land.y + 11, seed + 55, 1.6);
        ctx.setLineDash([6, 6]);
        roughCircle(ctx, land.x, land.y, 18 - 10 * t01, seed + 57, 0.2, 12);
        ctx.setLineDash([]);
      }

      // ---- target crosshair + converging lock ring ----
      const blink = 0.5 + 0.5 * Math.sin(CLOCK.time * 10);
      ctx.strokeStyle = `rgba(0,0,0,${blink.toFixed(2)})`;
      ctx.lineWidth = 2.4;
      roughLine(ctx, this.target.x - 11, this.target.y, this.target.x + 11, this.target.y, seed + 7, 1.6);
      roughLine(ctx, this.target.x, this.target.y - 11, this.target.x, this.target.y + 11, seed + 11, 1.6);
      // corner brackets (target lock)
      ctx.strokeStyle = `rgba(0,0,0,${(0.3 + 0.5 * t01).toFixed(2)})`;
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 4; i++) {
        const sx = i & 1 ? 1 : -1, sy = i & 2 ? 1 : -1;
        const cx0 = this.target.x + sx * 22, cy0 = this.target.y + sy * 22;
        roughLine(ctx, cx0, cy0 - sy * 8, cx0, cy0, seed + 61 + i * 5, 1.4);
        roughLine(ctx, cx0 - sx * 8, cy0, cx0, cy0, seed + 63 + i * 5, 1.4);
      }
      ctx.setLineDash([5, 7]);
      roughCircle(ctx, this.target.x, this.target.y, 34 - 20 * t01, seed + 65, 0.1, 14);
      ctx.setLineDash([]);
    }

    // ---- edge-mount plate bolted to the sheet ----
    const px0 = this.side < 0 ? 0 : this.w - 14;
    const pin = this.side < 0 ? 14 : this.w - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.fillRect(px0, this.y - 46, 14, 92);
    hatchRect(ctx, px0, this.y - 46, 14, 92, 6, seed + 43,
      { angle: 1.2, color: 'rgba(0,0,0,0.5)', width: 1.8, amp: 1.4 });
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    roughRect(ctx, px0, this.y - 46, 14, 92, seed + 41, 2.4);
    // A-frame struts down to the axle
    ctx.lineWidth = 3.2;
    roughLine(ctx, pin, this.y - 40, b.x, b.y - 8, seed + 45, 2.2);
    roughLine(ctx, pin, this.y + 40, b.x, b.y + 8, seed + 47, 2.2);
    // bolt heads
    ctx.fillStyle = '#000';
    for (const oy of [-40, 0, 40]) {
      roughCirclePath(ctx, pin, this.y + oy, 3.2, seed + 49 + oy, 0.3, 8);
      ctx.fill();
    }

    // ---- carriage wheel ----
    roughCirclePath(ctx, b.x, b.y, this.R, seed + 13, 0.14, 12);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();
    // inner rim echo
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    roughCircle(ctx, b.x, b.y, this.R * 0.82, seed + 15, 0.16, 12);
    // spokes
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    for (let i = 0; i < 4; i++) {
      const aa = i * TAU / 4 + CLOCK.time * 1.4 * this.turn;
      roughLine(ctx, b.x - Math.cos(aa) * this.R * 0.7, b.y - Math.sin(aa) * this.R * 0.7,
        b.x + Math.cos(aa) * this.R * 0.7, b.y + Math.sin(aa) * this.R * 0.7, seed + 17 + i * 9, 1.6);
    }
    // rim lugs turning with the wheel
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 8; i++) {
      const aa = i * TAU / 8 + CLOCK.time * 1.4 * this.turn;
      roughLine(ctx, b.x + Math.cos(aa) * this.R, b.y + Math.sin(aa) * this.R,
        b.x + Math.cos(aa) * (this.R + 5), b.y + Math.sin(aa) * (this.R + 5), seed + 71 + i * 5, 1.4);
    }
    // hub with a screw cross
    roughCirclePath(ctx, b.x, b.y, 5, seed + 77, 0.3, 8);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.6;
    roughLine(ctx, b.x - 3, b.y, b.x + 3, b.y, seed + 79, 1);
    roughLine(ctx, b.x, b.y - 3, b.x, b.y + 3, seed + 81, 1);

    // ---- barrel (aimed at the target), kicking back on every shot ----
    const back = this.recoil * 11;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(a);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.4;
    // body
    roughLine(ctx, 10 - back, -9, 56 - back, -9, seed + 23, 2);
    roughLine(ctx, 10 - back, 9, 56 - back, 9, seed + 29, 2);
    // breech block at the rear
    roughLine(ctx, 6 - back, -12, 6 - back, 12, seed + 33, 1.6);
    roughLine(ctx, 6 - back, -12, 10 - back, -9, seed + 35, 1.4);
    roughLine(ctx, 6 - back, 12, 10 - back, 9, seed + 37, 1.4);
    // muzzle ring
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(58 - back, 0, 11, 0, TAU);
    ctx.stroke();
    // barrel bands
    ctx.lineWidth = 2.4;
    roughLine(ctx, 26 - back, -9, 26 - back, 9, seed + 39, 1.4);
    roughLine(ctx, 42 - back, -9, 42 - back, 9, seed + 41, 1.4);
    // grey hatch on the belly of the barrel
    ctx.save();
    ctx.beginPath();
    ctx.rect(8 - back, 0, 50, 10);
    ctx.clip();
    hatchRect(ctx, 6 - back, 0, 56, 12, 5, seed + 43,
      { angle: 0.7, color: 'rgba(0,0,0,0.45)', width: 1.7, amp: 1.3 });
    ctx.restore();

    // muzzle flash starburst
    if (this.flashT > 0) {
      const kf = this.flashT / 0.16;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const fa = i * TAU / 8 + 0.3;
        const r1 = 13, r2 = 15 + kf * 26;
        roughLine(ctx, 58 - back + Math.cos(fa) * r1, Math.sin(fa) * r1,
          58 - back + Math.cos(fa) * r2, Math.sin(fa) * r2, seed + 61 + i * 5, 2.4);
      }
      roughCirclePath(ctx, 58 - back, 0, 6 + kf * 7, seed + 83, 0.3, 10);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    // hanging ink drip while the tube reloads
    if (this.phase === 'reload') {
      const gk = clamp(1 - this.t / (this.reloadDur || 1), 0, 1);
      const dr = 3 + gk * 5 + Math.sin(CLOCK.time * 8) * 0.8;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(52 - back, 9);
      ctx.quadraticCurveTo(52 - back - dr * 0.7, 9 + dr * 1.2, 52 - back, 9 + dr * 2);
      ctx.quadraticCurveTo(52 - back + dr * 0.7, 9 + dr * 1.2, 52 - back, 9);
      ctx.fill();
    }

    // charge ring closing around the muzzle as the shot comes
    if (this.phase === 'aim') {
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(58 - back, 0, 17, -Math.PI / 2, -Math.PI / 2 + TAU * t01);
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }

  hitTest(x, y) {
    const b = this.base, m = this.muzzle;
    return distToPolyline(x, y, [b, m]) < 15 || dist(x, y, b.x, b.y) < this.R;
  }
}
