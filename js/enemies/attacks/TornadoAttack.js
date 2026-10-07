'use strict';

/* ============================================================
   21. TORNADO — a fat ink whirlwind dances across the sheet,
   dragging the star and whole streams of ink toward its funnel,
   then spitting the mess back out. Pure chaos, zero excuses.
   Visual: hard silhouette edges matching the funnel, rotation
   wrap-arcs, torn debris orbiting in front of AND behind the
   funnel, ground dust scribbles at the base and a bumpy hatched
   cloud head with wind ticks screaming off it.
   ============================================================ */

class TornadoAttack extends Enemy {
  static type = 'tornado';
  static family = 'field';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    this.cx = w * (0.5 + rnd(-0.06, 0.06));     // travel centre
    this.horiz = chance(0.5) ? 1 : -1;
    this.travelR = w * rnd(0.2, 0.3);
    this.R = rnd(46, 64);
    this.period = rnd(4.6, 6.6);
    this.dir = chance(0.5) ? 1 : -1;            // swirl direction
    this.x = this.cx;
    this.funnelTop = h * rnd(0.14, 0.34);
    this.funnelBot = h * rnd(0.78, 0.95);
    this.life = Math.max(6, 8.5 - (this.diff - 1) * 0.25);
    this.spitT = rnd(0.55, 1.0);
    // orbiting scraps (purely visual)
    this.deb = [];
    for (let i = 0; i < 8; i++) {
      this.deb.push({
        a: rnd(TAU),
        k: rnd(0.06, 0.92),
        rr: rnd(1.04, 1.4),
        s: rnd(6, 12),
        v: rnd(2.2, 4.4) * (chance(0.3) ? -1 : 1),
        sh: rint(0, 2)
      });
    }
    this.label = 'TORNADO';
  }

  update(dt) {
    super.update(dt);
    const g = this.game;
    const p = g.player;
    this.x = this.cx + this.horiz * Math.sin(this.age / this.period * TAU) * this.travelR;

    const midY = (this.funnelTop + this.funnelBot) * 0.5;
    const pullR = this.R * 2.6;

    // whirl the star toward the axis (and around it)
    if (p.alive) {
      const dx = this.x - p.x, dy = midY - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < pullR) {
        const f = 1 - d / pullR;
        const nx = dx / d, ny = dy / d;
        const pull = 620 * f * f + 130 * f;
        p.fx += nx * pull + ny * pull * 0.78 * this.dir;
        p.fy += ny * pull - nx * pull * 0.78 * this.dir;
      }
      if (d < this.R * 0.55) p.hit();
    }

    // swirl the ink around too (the funnel gobbles bullets)
    const bl = g.bullets.bullets.used;
    for (let i = 0; i < bl.length; i++) {
      const b = bl[i];
      if (!b.alive) continue;
      const dx = this.x - b.x, dy = midY - b.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < pullR * 1.15) {
        const f = 1 - d / (pullR * 1.15);
        b.vx += (dx / d * 160 - dy / d * 310 * this.dir) * f * dt;
        b.vy += (dy / d * 160 + dx / d * 310 * this.dir) * f * dt;
      }
    }

    // spit stray drops out of the funnel
    this.spitT -= dt;
    if (this.spitT <= 0) {
      this.spitT = Math.max(0.32, rnd(0.5, 0.95) - this.diff * 0.03);
      const a = rnd(TAU);
      const sp = rnd(150, 260);
      g.bullets.spawnBullet({
        x: this.x + rnd(-5, 5), y: midY + rnd(-10, 10),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rnd(5, 8), style: 'blob', behavior: 'straight', maxLife: 5
      });
    }

    if (this.age >= this.life) {
      this.sparks(this.x, midY, 20);
      this.finish();
    }
  }

  draw(ctx) {
    const t = this.age;
    const fade = clamp((this.life - t) / 0.6, 0, 1);
    const seed = this.seed;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // funnel profile — matches the danger zone exactly
    const rxAt = (k) => this.R * (0.3 + 0.7 * k);
    const yAt = (k) => lerp(this.funnelTop, this.funnelBot, k);

    // ---- ground dust scribbled at the base ----
    const db = this.funnelBot;
    roughEllipsePath(ctx, this.x, db + 6, this.R * 1.5, this.R * 0.3, seed + 101, 0.3, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2.6;
    ctx.stroke();
    // sucked-in dust puffs
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.7 + i * 0.33) % 1;
      const a = (1 - ph) * 0.5;
      if (a < 0.05) continue;
      ctx.strokeStyle = `rgba(0,0,0,${a.toFixed(2)})`;
      ctx.lineWidth = 2;
      const pa = seed + i * 2.7 + CLOCK.tick9;
      roughCircle(ctx, this.x + Math.cos(pa) * this.R * (1.2 + ph * 0.7),
        db + 4 - ph * 16, 5 + ph * 7, pa, 0.3, 8);
    }

    // ---- debris on the far side (drawn behind the funnel) ----
    const drawDebris = (front) => {
      for (const d of this.deb) {
        const a = d.a + t * d.v * this.dir;
        if ((Math.sin(a) >= 0) !== front) continue;
        let k = (d.k + Math.sin(t * 0.9 + d.a) * 0.05) % 1;
        if (k < 0) k += 1;
        const rx = rxAt(k) * d.rr;
        const px = this.x + Math.cos(a) * rx;
        const py = yAt(k) + Math.sin(a) * rx * 0.3;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + t * d.v * 2);
        if (front) ctx.globalAlpha = fade;
        else ctx.globalAlpha = fade * 0.45;
        if (d.sh === 0) {                    // torn triangle
          ctx.fillStyle = 'rgba(0,0,0,0.62)';
          ctx.beginPath();
          ctx.moveTo(-d.s, -d.s * 0.6);
          ctx.lineTo(d.s, -d.s * 0.2);
          ctx.lineTo(-d.s * 0.3, d.s * 0.8);
          ctx.closePath();
          ctx.fill();
        } else if (d.sh === 1) {             // paper scrap
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1.6;
          ctx.fillRect(-d.s * 0.9, -d.s * 0.45, d.s * 1.8, d.s * 0.9);
          ctx.strokeRect(-d.s * 0.9, -d.s * 0.45, d.s * 1.8, d.s * 0.9);
        } else {                             // little stick / leaf
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-d.s, 0);
          ctx.quadraticCurveTo(0, -d.s * 0.7, d.s, 0);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.globalAlpha = fade;
    };
    drawDebris(false);

    // ---- funnel silhouette edges (thick marker + jittered grey echo) ----
    const edgePts = (side, inset) => {
      const P = [];
      for (let s = 0; s <= 8; s++) {
        const k = s / 8;
        P.push({
          x: this.x + side * (rxAt(k) - inset) + wob(seed + (side > 0 ? 31 : 61) + s, 2.6),
          y: yAt(k) + wob(seed + s * 3, 2)
        });
      }
      return P;
    };
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.4;
    roughPath(ctx, edgePts(-1, 0), seed + 121, 2.4);
    roughPath(ctx, edgePts(1, 0), seed + 137, 2.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    roughPath(ctx, edgePts(-1, 5), seed + 151, 4.4);
    roughPath(ctx, edgePts(1, 5), seed + 163, 4.4);

    // ---- wind bands: sine-swung strokes, narrow at the top ----
    const N = 6, steps = 16;
    for (let b = 0; b < N; b++) {
      const P = [];
      for (let s = 0; s <= steps; s++) {
        const k = s / steps;
        const yy = lerp(this.funnelTop, this.funnelBot, easeInOutCubic(k));
        const rx = this.R * (0.28 + 0.78 * k);
        const bend = Math.sin(b * 1.35 + t * 3.4 * this.dir + k * 3.2) * rx;
        P.push({ x: this.x + bend + wob(seed + b * 41 + s, 2.4), y: yy + wob(seed + b * 57 + s, 2.4) });
      }
      ctx.strokeStyle = b % 2 ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.26)';
      ctx.lineWidth = b % 2 ? 2.6 : 5;
      roughPath(ctx, P, seed + b * 13, 2.6);
    }

    // ---- rotation wrap-arcs drifting down the cone ----
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 4; i++) {
      let k = (i / 4 + t * 0.4 * this.dir) % 1;
      if (k < 0) k += 1;
      const rx = rxAt(k), yy = yAt(k);
      const P = [];
      for (let s = 0; s <= 6; s++) {
        const a = (s / 6) * Math.PI;                 // front half of the ring
        P.push({
          x: this.x + Math.cos(a) * rx + wob(seed + i * 17 + s, 2),
          y: yy + Math.sin(a) * rx * 0.24 + wob(seed + i * 19 + s, 2)
        });
      }
      roughPath(ctx, P, seed + 171 + i * 7, 2.2);
    }

    // ---- debris on the near side (in front of the funnel) ----
    drawDebris(true);

    // ---- bumpy cloud head, hatched on the underside ----
    const cw = this.R * 1.15, ch = this.R * 0.44;
    const cx0 = this.x, cy0 = this.funnelTop - 8;
    const cloudPath = () => {
      const L = cx0 - cw, Rr = cx0 + cw;
      ctx.beginPath();
      ctx.moveTo(L, cy0 + ch * 0.5);
      ctx.quadraticCurveTo(L - ch * 0.5, cy0 - ch * 0.2, L + cw * 0.3, cy0 - ch * 0.5);
      ctx.quadraticCurveTo(cx0 - cw * 0.34, cy0 - ch * 1.3, cx0 + cw * 0.14, cy0 - ch * 0.68);
      ctx.quadraticCurveTo(Rr - cw * 0.3, cy0 - ch * 1.1, Rr + ch * 0.4, cy0 - ch * 0.05);
      ctx.quadraticCurveTo(Rr + ch * 0.15, cy0 + ch * 0.62, Rr - cw * 0.28, cy0 + ch * 0.55);
      ctx.lineTo(L, cy0 + ch * 0.5);
      ctx.closePath();
    };
    cloudPath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();
    // grey shading on the belly of the cloud
    ctx.save();
    cloudPath();
    ctx.clip();
    hatchRect(ctx, cx0 - cw, cy0 - ch * 0.1, cw * 2, ch * 0.8, 7, seed + 181,
      { angle: 0.75, color: 'rgba(0,0,0,0.3)', width: 2, amp: 1.8 });
    ctx.restore();
    // two small side puffs
    for (const s of [-1, 1]) {
      roughCirclePath(ctx, cx0 + s * cw * 1.05, cy0 + ch * 0.15, ch * 0.38, seed + 183 + s * 7, 0.3, 8);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    // ---- wind ticks screaming off the head ----
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 4; i++) {
      const s = i < 2 ? -1 : 1;
      const oy = (i % 2 ? -1 : 1) * ch * 0.5;
      const w = this.R * (0.5 + 0.3 * ((CLOCK.tick9 + i) % 2));
      roughLine(ctx, cx0 + s * cw * 1.15, cy0 + oy,
        cx0 + s * (cw * 1.15 + w), cy0 + oy * 1.3, seed + 191 + i * 7, 3);
    }
    // motion arcs over the top
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 2.6;
    for (let i = 0; i < 2; i++) {
      const P = [];
      for (let s = 0; s <= 5; s++) {
        P.push({
          x: cx0 - cw * 0.7 + (s / 5) * cw * 1.4,
          y: cy0 - ch * 1.6 - i * 12 + Math.sin(s * 1.2 + CLOCK.tick9) * 3
        });
      }
      roughPath(ctx, P, seed + 201 + i * 7, 2.4);
    }

    ctx.restore();
  }

  hitTest(x, y) {
    if (this.age < 0.25 || this.age > this.life - 0.4) return false;
    const k = clamp((y - this.funnelTop) / (this.funnelBot - this.funnelTop), 0, 1);
    const rx = this.R * (0.3 + 0.7 * k);
    return Math.abs(x - this.x) / rx <= 1;
  }
}
