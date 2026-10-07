'use strict';

/* ============================================================
   23. METEOR — a fat ink rock screams down onto a telegraph-
   crossed landing spot. On impact: a shockwave ring of drops,
   sparked chunks, and a smouldering crater that stays hot for a
   blink.
   Visual: tapered smoke ribbon + speed streaks behind the rock,
   a danger circle that shrinks onto the landing spot as the
   meteor nears, a hatched boulder with white-hot cracks, and
   after the crash — expanding shock rings, a white flash and
   torn-paper cracks radiating across the sheet.
   ============================================================ */

class MeteorAttack extends Enemy {
  static type = 'meteor';
  static family = 'bullet';

  init(params) {
    super.init(params);
    const w = this.w, h = this.h;
    this.fx = rnd(0.16, 0.84) * w;
    this.fy = h * rnd(0.3, 0.86);
    this.R = rnd(28, 38);
    this.fall = Math.max(1.0, 1.55 - (this.diff - 1) * 0.07);
    this.x0 = this.fx - rnd(140, 280) * (chance(0.5) ? 1 : -1);
    this.y0 = -rnd(40, 90);
    this.x = this.x0;
    this.y = this.y0;
    this.hit = false;      // landed
    this.craterT = 0;
    this.shockT = 0;       // impact shock-ring timer (visual)
    this.label = 'METEOR';
  }

  update(dt) {
    super.update(dt);
    if (this.shockT > 0) this.shockT = Math.max(0, this.shockT - dt);
    if (this.hit) {
      this.craterT += dt;
      if (CLOCK.frame % 3 === 0) {
        this.game.bullets.spawnParticle({
          x: this.x + rnd(-8, 8), y: this.y + rnd(-5, 3),
          vx: rnd(-12, 12), vy: rnd(-70, -34),
          life: 0.7, size: rnd(2, 4.5), g: rint(40, 110), drag: 1.2
        });
      }
      if (this.craterT >= 1.7) this.finish();
      return;
    }

    const k = this.age / this.fall;
    if (k >= 1) {
      this.x = this.fx;
      this.y = this.fy;
      this.impact();
    } else {
      const kk = k * k * (3 - 2 * k);
      this.x = lerp(this.x0, this.fx, kk);
      this.y = lerp(this.y0, this.fy, kk);
    }

    // flame trail behind the rock
    if (CLOCK.frame % 2 === 0) {
      const dx = this.fx - this.x0, dy = this.fy - this.y0;
      const d = Math.hypot(dx, dy) || 1;
      this.game.bullets.spawnParticle({
        x: this.x - dx / d * 16, y: this.y - dy / d * 16,
        vx: rnd(-24, 24), vy: rnd(-24, 24),
        life: 0.5, size: rnd(2, 4.5), g: rint(60, 160), drag: 2
      });
    }
  }

  impact() {
    this.hit = true;
    this.shockT = 1;
    const g = this.game;
    this.fireFlash(10);
    g.renderer.addShake(16);

    // grey shock burst
    g.bullets.burst(this.x, this.y, 24, { s0: 120, s1: 480, life: 0.9, size: 5, g: rint(60, 160) });
    // expanding ring of droplets
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16;
      const sp = rnd(240, 340) + this.diff * 22;
      g.bullets.spawnBullet({
        x: this.x, y: this.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rnd(4, 6.5), style: 'blob', behavior: 'straight',
        ax: -Math.cos(a) * 60, ay: -Math.sin(a) * 60, maxLife: 4
      });
    }
    // bouncing chunks
    for (let i = 0; i < 6; i++) {
      const a = rnd(-2.9, -0.2);
      const sp = rnd(180, 420);
      g.bullets.spawnBullet({
        x: this.x, y: this.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rnd(6, 12), style: 'shard', behavior: 'bounce',
        spin: rnd(-5, 5), maxLife: 3
      });
    }
    // direct crush on the star
    if (dist(this.x, this.y, g.player.x, g.player.y) < this.R + 22) g.player.hit();
  }

  draw(ctx) {
    const seed = this.seed;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (!this.hit) {
      const dx = this.fx - this.x0, dy = this.fy - this.y0;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;                 // direction of travel
      const kLeft = clamp(1 - this.age / this.fall, 0, 1);   // 1 -> 0 as it nears

      // ---- landing spot: shrinking danger circle + corner ticks ----
      ctx.setLineDash([8, 7]);
      ctx.strokeStyle = `rgba(0,0,0,${(0.16 + 0.38 * (1 - kLeft)).toFixed(2)})`;
      ctx.lineWidth = 2;
      roughCircle(ctx, this.fx, this.fy, this.R * (0.7 + kLeft * 1.7), seed + 61, 0.1, 18);
      ctx.setLineDash([]);
      const blink = 0.45 + 0.55 * Math.abs(Math.sin(CLOCK.time * 6));
      ctx.strokeStyle = `rgba(0,0,0,${blink.toFixed(2)})`;
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 4; i++) {
        const a = i * TAU / 4 + Math.PI / 4;
        const rr = this.R * 1.35;
        roughLine(ctx, this.fx + Math.cos(a) * rr, this.fy + Math.sin(a) * rr,
          this.fx + Math.cos(a) * (rr + 13), this.fy + Math.sin(a) * (rr + 13), seed + 65 + i * 7, 1.8);
      }

      // dashed fall path
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      roughLine(ctx, this.x - ux * 26, this.y - uy * 26, this.fx, this.fy, seed + 5, 2);
      ctx.setLineDash([]);
      // struck cross on the spot
      ctx.strokeStyle = `rgba(0,0,0,${blink.toFixed(2)})`;
      ctx.lineWidth = 2.6;
      roughLine(ctx, this.fx - 14, this.fy, this.fx + 14, this.fy, seed + 9, 1.6);
      roughLine(ctx, this.fx, this.fy - 14, this.fx, this.fy + 14, seed + 13, 1.6);

      // ---- tapered smoke ribbon + speed streaks behind ----
      const nx = -uy, ny = ux;
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.beginPath();
      ctx.moveTo(this.x + nx * this.R * 0.7, this.y + ny * this.R * 0.7);
      ctx.lineTo(this.x - ux * 150 + nx * 6, this.y - uy * 150 + ny * 6);
      ctx.lineTo(this.x - ux * 150 - nx * 6, this.y - uy * 150 - ny * 6);
      ctx.lineTo(this.x - nx * this.R * 0.7, this.y - ny * this.R * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2.4;
      for (let i = -1; i <= 1; i++) {
        const o = i * this.R * 0.7;
        const len = 70 + (i + 1) * 26 + wob(seed + i * 3, 14);
        roughLine(ctx, this.x - ux * 26 + nx * o, this.y - uy * 26 + ny * o,
          this.x - ux * len + nx * o * 1.4, this.y - uy * len + ny * o * 1.4, seed + i * 17, 3);
      }

      // flame coat: long flickering spokes (9 FPS flame)
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 5; i++) {
        const a = seed + i * 91 + CLOCK.tick9 * 7;
        const r1 = this.R * 1.15, r2 = this.R * (1.9 + wob(seed + i * 13, 0.5));
        roughLine(ctx, this.x + Math.cos(a) * r1, this.y + Math.sin(a) * r1,
          this.x + Math.cos(a) * r2, this.y + Math.sin(a) * r2, seed + 15 + i * 9, 2);
      }

      // ---- the rock: jagged lump, hatched belly, white-hot cracks ----
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU;
        const rr = this.R + wob(seed + i * 13, this.R * 0.22);
        const px = this.x + Math.cos(a) * rr, py = this.y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(232,232,232,0.92)';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3.2;
      ctx.stroke();
      // grey hatch on the lower belly
      ctx.save();
      ctx.clip();
      hatchRect(ctx, this.x - this.R, this.y - this.R * 0.1, this.R * 2, this.R * 1.4, 7, seed + 77,
        { angle: 0.85, color: 'rgba(0,0,0,0.4)', width: 2, amp: 1.8 });
      ctx.restore();
      // black scorch cracks with a white glow line beside them
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.8;
      roughLine(ctx, this.x - this.R * 0.5, this.y - this.R * 0.4, this.x + this.R * 0.2, this.y - this.R * 0.1, seed + 43, 1.6);
      roughLine(ctx, this.x + this.R * 0.2, this.y - this.R * 0.1, this.x - this.R * 0.1, this.y + this.R * 0.5, seed + 47, 1.6);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1.3;
      roughLine(ctx, this.x - this.R * 0.48, this.y - this.R * 0.44, this.x + this.R * 0.18, this.y - this.R * 0.14, seed + 45, 1.4);
      roughLine(ctx, this.x + this.R * 0.22, this.y - this.R * 0.06, this.x - this.R * 0.08, this.y + this.R * 0.46, seed + 49, 1.4);
      // torn crags nicked off the edge
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + 0.7;
        const rr = this.R * 0.72;
        roughLine(ctx, this.x + Math.cos(a) * rr, this.y + Math.sin(a) * rr,
          this.x + Math.cos(a) * this.R * 1.05, this.y + Math.sin(a) * this.R * 1.05, seed + 91 + i * 7, 2);
      }
      // crumbs tearing off behind
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      for (let i = 0; i < 3; i++) {
        const off = 30 + i * 26;
        const cxp = this.x - ux * off + nx * wob(seed + i * 23, 10);
        const cyp = this.y - uy * off + ny * wob(seed + i * 29, 10);
        const cs = 2.5 + wob(seed + i * 31, 1.5);
        ctx.beginPath();
        ctx.moveTo(cxp - cs, cyp - cs * 0.6);
        ctx.lineTo(cxp + cs, cyp - cs);
        ctx.lineTo(cxp + cs * 0.3, cyp + cs);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // ---- impact shock rings + flash ----
      if (this.shockT > 0) {
        const sk = 1 - this.shockT;            // 0 -> 1
        if (sk < 0.3) {                         // white core flash
          ctx.globalAlpha = 0.7 * (1 - sk / 0.3);
          roughCirclePath(ctx, this.x, this.y, this.R * 1.4, seed + 95, 0.2, 14);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.globalAlpha = this.shockT;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3.4 - 2.4 * sk;
        roughCircle(ctx, this.x, this.y, this.R * (1.1 + sk * 3.1), seed + 91, 0.14, 22);
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 2;
        roughCircle(ctx, this.x, this.y, this.R * (0.9 + sk * 2.1), seed + 97, 0.16, 18);
        ctx.globalAlpha = 1;
      }

      // smouldering crater
      const hot = this.craterT < 0.6 ? 1 : Math.max(0, 1 - (this.craterT - 0.6) / 1.1);
      roughEllipsePath(ctx, this.x, this.y + 6, this.R * 1.3, this.R * 0.55, seed + 21, 0.28, 14);
      ctx.globalAlpha = 0.85 * hot;
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(0,0,0,${(0.9 * hot).toFixed(2)})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6 + 0.2;
        roughLine(ctx, this.x + Math.cos(a) * this.R * 1.3, this.y + 6 + Math.sin(a) * this.R * 0.55,
          this.x + Math.cos(a) * this.R * 1.7, this.y + 6 + Math.sin(a) * this.R * 0.8, seed + 31 + i * 7, 2);
      }

      // torn-paper cracks shooting across the sheet
      ctx.strokeStyle = `rgba(0,0,0,${(0.15 + 0.7 * hot).toFixed(2)})`;
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 7; i++) {
        const a = i * TAU / 7 + wob(seed + i * 5, 0.35);
        const ex1 = this.x + Math.cos(a) * this.R * 1.35;
        const ey1 = this.y + 6 + Math.sin(a) * this.R * 0.6;
        const rr = this.R * (1.9 + (1 + wob(seed + i * 3, 0.4)) * 0.5);
        const ex2 = this.x + Math.cos(a) * rr;
        const ey2 = this.y + 6 + Math.sin(a) * rr * 0.55;
        roughLine(ctx, ex1, ey1, ex2, ey2, seed + 101 + i * 7, 3);
        // little branch off the crack
        const ba = a + wob(seed + i * 9, 0.8);
        roughLine(ctx, lerp(ex1, ex2, 0.6), lerp(ey1, ey2, 0.6),
          lerp(ex1, ex2, 0.6) + Math.cos(ba) * 22, lerp(ey1, ey2, 0.6) + Math.sin(ba) * 16,
          seed + 103 + i * 7, 2.4);
      }

      // rising dust puffs
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const ph = (this.craterT * 0.8 + i * 0.37) % 1;
        const a = (1 - ph) * 0.55;
        if (a < 0.06) continue;
        ctx.strokeStyle = `rgba(0,0,0,${a.toFixed(2)})`;
        const pa = seed + i * 17 + CLOCK.tick9;
        roughCircle(ctx, this.x + Math.cos(pa) * this.R * (0.6 + i * 0.4),
          this.y - ph * 34 - 6, 4 + ph * 8, pa, 0.3, 8);
      }
    }

    ctx.restore();
  }

  hitTest(x, y) {
    if (this.hit) {
      return this.craterT < 0.55 && dist(x, y, this.x, this.y) < this.R * 1.25;
    }
    if (this.age < 0.2) return false;
    return dist(x, y, this.x, this.y) < this.R;
  }
}
