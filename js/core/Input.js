'use strict';

/* ============================================================
   Input — mouse / touch / pen via Pointer Events + keyboard.
   The star must follow the cursor/finger with ZERO delay, so the
   pointer position is stored raw and the Player snaps to it.
   ============================================================ */

class Input {
  constructor(canvas, renderer) {
    this.canvas = canvas;
    this.renderer = renderer;

    this.keys = new Set();      // currently held keys
    this.taps = new Set();      // keys pressed this frame (edge)
    this.pointer = {
      x: 0, y: 0,               // logical position
      down: false,
      isTouch: false,
      seen: false,              // any pointer activity ever happened
      inside: true,
      justDown: false,
      justUp: false
    };

    this._bind();
  }

  _bind() {
    const c = this.canvas;

    const toLocal = (e) => {
      const r = c.getBoundingClientRect();
      return this.renderer.clientToLocal(e.clientX - r.left, e.clientY - r.top);
    };

    c.addEventListener('pointerdown', (e) => {
      const p = toLocal(e);
      const pt = this.pointer;
      pt.x = p.x; pt.y = p.y;
      pt.down = true;
      pt.justDown = true;
      pt.seen = true;
      pt.inside = true;
      pt.isTouch = (e.pointerType === 'touch' || e.pointerType === 'pen');
      if (pt.isTouch) { try { c.setPointerCapture(e.pointerId); } catch (_) {} }
      e.preventDefault();
    }, { passive: false });

    c.addEventListener('pointermove', (e) => {
      const p = toLocal(e);
      const pt = this.pointer;
      pt.x = p.x; pt.y = p.y;
      pt.seen = true;
      pt.inside = true;
      if (e.pointerType === 'mouse') pt.isTouch = false;
      e.preventDefault();
    }, { passive: false });

    const up = (e) => {
      const pt = this.pointer;
      if (pt.down) pt.justUp = true;
      pt.down = false;
      if (e && e.preventDefault) e.preventDefault();
    };
    c.addEventListener('pointerup', up, { passive: false });
    c.addEventListener('pointercancel', up, { passive: false });
    c.addEventListener('pointerleave', () => { this.pointer.inside = false; });
    c.addEventListener('pointerenter', () => { this.pointer.inside = true; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.taps.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.pointer.down = false; });
  }

  held(code) { return this.keys.has(code); }
  tapped(code) { return this.taps.has(code); }

  /** WASD / arrows direction vector */
  axis() {
    let x = 0, y = 0;
    if (this.held('KeyD') || this.held('ArrowRight')) x += 1;
    if (this.held('KeyA') || this.held('ArrowLeft')) x -= 1;
    if (this.held('KeyS') || this.held('ArrowDown')) y += 1;
    if (this.held('KeyW') || this.held('ArrowUp')) y -= 1;
    if (x && y) { const k = Math.SQRT1_2; x *= k; y *= k; }
    return { x, y };
  }

  /** clear per-frame edge flags — call at the very end of the frame */
  endFrame() {
    this.taps.clear();
    this.pointer.justDown = false;
    this.pointer.justUp = false;
  }
}
