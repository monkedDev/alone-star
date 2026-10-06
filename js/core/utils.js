'use strict';

/* ============================================================
   alone star — utils.js
   Math / random / clocks + "Ugly Doodle" pen & marker helpers.
   All strokes are hand-wobbled. Noise is regenerated every
   3 frames -> contour "twitch" effect described in the design.
   ============================================================ */

const TAU = Math.PI * 2;

/** Global clock shared by every module (updated once per rAF). */
const CLOCK = {
  frame: 0,
  time: 0,
  dt: 0,
  fps: 60,
  tick9: 0, // strictly 9 FPS quantized tick (menu rays, grid, hatch)
  _acc: 0,
  _frames: 0
};

function clockTick(dt) {
  CLOCK.frame++;
  CLOCK.time += dt;
  CLOCK.dt = dt;
  CLOCK.tick9 = Math.floor(CLOCK.time * 9);
  CLOCK._acc += dt;
  CLOCK._frames++;
  if (CLOCK._acc >= 0.5) {
    CLOCK.fps = Math.round(CLOCK._frames / CLOCK._acc);
    CLOCK._acc = 0;
    CLOCK._frames = 0;
  }
}

/* ---------------- random / math ---------------- */

function rnd(a = 1, b) { return b === undefined ? Math.random() * a : a + Math.random() * (b - a); }
function rint(a, b) { return Math.floor(rnd(a, b + 1)); }
function chance(p) { return Math.random() < p; }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeInCubic(t) { return t * t * t; }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
function angTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); }
function approachAngle(a, target, step) {
  let d = ((target - a) % TAU + TAU + Math.PI) % TAU - Math.PI;
  return a + clamp(d, -step, step);
}

/** deterministic hash -> [0,1) */
function hash1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/* ---------------- hand-drawn noise ---------------- */

/** noise salt: changes strictly every 3 frames */
function wseed() { return Math.floor(CLOCK.frame / 3); }

/** jitter in [-amp, amp], refreshed every 3 frames */
function wob(seed, amp) {
  return (hash1(seed * 12.9898 + wseed() * 78.233) - 0.5) * 2 * amp;
}

/* ---------------- geometry ---------------- */

function pointSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function distToPolyline(px, py, pts) {
  let m = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = pointSegDist(px, py, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    if (d < m) m = d;
  }
  return m;
}

function quadBezier(x0, y0, cx, cy, x1, y1, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({ x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 });
  }
  return out;
}

/* ---------------- doodle drawing ---------------- */

const DOODLE_FONT = '"Comic Sans MS", "Segoe Print", "Marker Felt", "Bradley Hand", cursive';

/** one sloppy marker stroke between two points */
function roughLine(ctx, x1, y1, x2, y2, seed, amp = 2) {
  const mx = (x1 + x2) / 2 + wob(seed, amp * 3.5);
  const my = (y1 + y2) / 2 + wob(seed + 1.7, amp * 3.5);
  ctx.beginPath();
  ctx.moveTo(x1 + wob(seed + 3.1, amp), y1 + wob(seed + 5.3, amp));
  ctx.quadraticCurveTo(mx, my, x2 + wob(seed + 7.9, amp), y2 + wob(seed + 11.3, amp));
  ctx.stroke();
}

/** sloppy polyline through points (smoothed, wobbling) */
function roughPath(ctx, pts, seed, amp = 2) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x + wob(seed, amp), pts[0].y + wob(seed + 1, amp));
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], nx = pts[i + 1];
    const mx = (p.x + nx.x) / 2 + wob(seed + i * 2.3, amp * 1.5);
    const my = (p.y + nx.y) / 2 + wob(seed + i * 2.9, amp * 1.5);
    ctx.quadraticCurveTo(p.x + wob(seed + i * 1.7, amp), p.y + wob(seed + i * 3.7, amp), mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x + wob(seed + 99, amp), last.y + wob(seed + 101, amp));
  ctx.stroke();
}

/** builds (does not paint) an irregular hand-drawn circle path */
function roughCirclePath(ctx, x, y, r, seed, amp = 0.1, segs = 20) {
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * TAU;
    const rr = r + wob(seed + i * 4.7, r * amp);
    const px = x + Math.cos(a) * rr + wob(seed + i * 2.1, r * amp * 0.35);
    const py = y + Math.sin(a) * rr + wob(seed + i * 3.3, r * amp * 0.35);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function roughCircle(ctx, x, y, r, seed, amp = 0.1, segs = 20) {
  roughCirclePath(ctx, x, y, r, seed, amp, segs);
  ctx.stroke();
}

function roughEllipsePath(ctx, x, y, rx, ry, seed, amp = 0.1, segs = 18) {
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * TAU;
    const kx = 1 + wob(seed + i * 4.1, amp);
    const ky = 1 + wob(seed + i * 6.3, amp);
    ctx.lineTo(x + Math.cos(a) * rx * kx, y + Math.sin(a) * ry * ky);
  }
  ctx.closePath();
}

function roughRect(ctx, x, y, w, h, seed, amp = 2) {
  roughLine(ctx, x, y, x + w, y, seed, amp);
  roughLine(ctx, x + w, y, x + w, y + h, seed + 11, amp);
  roughLine(ctx, x + w, y + h, x, y + h, seed + 23, amp);
  roughLine(ctx, x, y + h, x, y, seed + 37, amp);
}

/** hand-written looking text (double stroke for ink feel) */
function doodleText(ctx, text, x, y, seed, size, opts = {}) {
  ctx.save();
  ctx.font = `${opts.weight || 'bold'} ${size}px ${DOODLE_FONT}`;
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = opts.baseline || 'middle';
  ctx.fillStyle = opts.color || '#000';
  ctx.fillText(text, x + wob(seed, 1.6), y + wob(seed + 4.2, 1.6));
  if (opts.double !== false) {
    ctx.fillText(text, x + wob(seed + 8.8, 2.4), y + wob(seed + 12.1, 2.4));
  }
  ctx.restore();
}

/** chaotic marker hatching clipped to a rect */
function hatchRect(ctx, x, y, w, h, gap, seed, opts = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const a = opts.angle !== undefined ? opts.angle : 0.78;
  const diag = Math.hypot(w, h) + gap * 2;
  const cx = x + w / 2, cy = y + h / 2;
  const dx = Math.cos(a), dy = Math.sin(a);
  const px = -dy, py = dx;
  const offset = (opts.offset || 0) % gap;
  ctx.lineWidth = opts.width || 2;
  ctx.strokeStyle = opts.color || '#000';
  ctx.lineCap = 'round';
  for (let i = -diag / 2 + offset; i < diag / 2; i += gap) {
    const bx = cx + px * i, by = cy + py * i;
    roughLine(ctx, bx - dx * diag / 2, by - dy * diag / 2, bx + dx * diag / 2, by + dy * diag / 2, seed + i * 3.1, opts.amp || 1.6);
  }
  ctx.restore();
}

/** dashed line that follows a polyline — used for laser warnings */
function dashedPolyline(ctx, pts, dashLen, gapLen, seed, amp, offset = 0) {
  const period = dashLen + gapLen;
  let pos = ((offset % period) + period) % period;
  let drawing = pos < dashLen;
  let need = drawing ? dashLen - pos : period - pos;
  ctx.beginPath();
  let prev = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const cur = pts[i];
    const segLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    let taken = 0;
    while (taken < segLen - 0.0001) {
      const step = Math.min(need, segLen - taken);
      const t0 = taken / segLen, t1 = (taken + step) / segLen;
      const ax = lerp(prev.x, cur.x, t0), ay = lerp(prev.y, cur.y, t0);
      const bx = lerp(prev.x, cur.x, t1), by = lerp(prev.y, cur.y, t1);
      if (drawing) {
        ctx.moveTo(ax + wob(seed + taken, amp), ay + wob(seed + taken + 3, amp));
        ctx.lineTo(bx + wob(seed + taken + 7, amp), by + wob(seed + taken + 11, amp));
      }
      taken += step;
      need -= step;
      if (need <= 0.0001) { drawing = !drawing; need = drawing ? dashLen : gapLen; }
    }
    prev = cur;
  }
  ctx.stroke();
}
