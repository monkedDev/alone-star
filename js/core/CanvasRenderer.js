'use strict';

/* ============================================================
   CanvasRenderer — paper sheet, camera shake, ink flash.
   The "paper" (white sheet + grey grain) is pre-rendered into an
   offscreen canvas once per resize and blitted every frame.
   ============================================================ */

class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = 0;
    this.h = 0;
    this.shake = 0;
    this.flash = 0;
    this.sx = 0;
    this.sy = 0;
    this.inverted = false; // released mode: whole sheet flips paper/ink
    this.paper = document.createElement('canvas');
    this.resize();
  }

  resize() {
    const w = Math.max(320, window.innerWidth);
    const h = Math.max(240, window.innerHeight);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.buildPaper();
  }

  /** white sheet with grey grain, pencil scratches and a soft vignette */
  buildPaper() {
    const pw = this.w + 80, ph = this.h + 80;
    const c = this.paper;
    c.width = pw;
    c.height = ph;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, pw, ph);

    // speckles
    const n = Math.round(pw * ph / 650);
    for (let i = 0; i < n; i++) {
      const px = Math.random() * pw, py = Math.random() * ph;
      const r = rnd(0.3, 1.5), g = rint(145, 228);
      x.fillStyle = `rgba(${g},${g},${g},${rnd(0.12, 0.45).toFixed(2)})`;
      x.beginPath();
      x.arc(px, py, r, 0, TAU);
      x.fill();
    }

    // faint long pencil strokes
    for (let i = 0; i < 12; i++) {
      x.strokeStyle = `rgba(0,0,0,${rnd(0.015, 0.05).toFixed(3)})`;
      x.lineWidth = rnd(0.5, 1.3);
      const y0 = rnd(ph);
      x.beginPath();
      x.moveTo(0, y0);
      x.bezierCurveTo(pw * 0.3, y0 + rnd(-45, 45), pw * 0.7, y0 + rnd(-45, 45), pw, y0 + rnd(-35, 35));
      x.stroke();
    }

    // subtle grey vignette
    const g = x.createRadialGradient(pw / 2, ph / 2, Math.min(pw, ph) * 0.3, pw / 2, ph / 2, Math.max(pw, ph) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.055)');
    x.fillStyle = g;
    x.fillRect(0, 0, pw, ph);
  }

  addShake(a) { this.shake = Math.max(this.shake, a); }
  addFlash(a) { this.flash = Math.max(this.flash, a); }

  update(dt) {
    if (this.shake > 0) {
      this.shake *= Math.exp(-7 * dt);
      if (this.shake < 0.3) this.shake = 0;
    }
    if (this.flash > 0) {
      this.flash *= Math.exp(-5.5 * dt);
      if (this.flash < 0.01) this.flash = 0;
    }
  }

  /** begin frame: white sheet + grain, camera-shake transform applied */
  begin() {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, this.w, this.h);
    this.sx = this.shake ? (Math.random() * 2 - 1) * this.shake : 0;
    this.sy = this.shake ? (Math.random() * 2 - 1) * this.shake : 0;
    c.save();
    c.translate(this.sx, this.sy);
    c.drawImage(this.paper, -40, -40);
  }

  /** end frame: restore transform + ink flash overlay + inversion */
  end() {
    const c = this.ctx;
    c.restore();
    if (this.flash > 0) {
      c.fillStyle = `rgba(0,0,0,${this.flash.toFixed(3)})`;
      c.fillRect(0, 0, this.w, this.h);
    }
    if (this.inverted) {
      // 'difference' with white = exact grey inversion (paper<->ink)
      c.save();
      c.globalCompositeOperation = 'difference';
      c.fillStyle = 'rgb(255,255,255)';
      c.fillRect(0, 0, this.w, this.h);
      c.restore();
    }
  }

  /** CSS pixels -> logical canvas pixels */
  clientToLocal(cx, cy) {
    const rw = this.canvas.clientWidth || this.w;
    const rh = this.canvas.clientHeight || this.h;
    return { x: cx * (this.w / rw), y: cy * (this.h / rh) };
  }
}
