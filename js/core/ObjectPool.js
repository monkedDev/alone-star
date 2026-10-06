'use strict';

/* ============================================================
   Generic Object Pool.
   Used for bullets, particles and rays (zero GC churn):
   objects are created once and recycled via alive/dead flags.
   ============================================================ */

class ObjectPool {
  /**
   * @param {Function} factory creates a blank object
   * @param {Function} reset    called when an object returns to the pool
   * @param {Number}  prewarm   instances created upfront
   */
  constructor(factory, reset = null, prewarm = 0) {
    this.factory = factory;
    this.reset = reset;
    this.free = [];
    this.used = [];
    for (let i = 0; i < prewarm; i++) this.free.push(factory());
  }

  /** take an object (from free list or newly created) */
  obtain() {
    const o = this.free.length ? this.free.pop() : this.factory();
    this.used.push(o);
    return o;
  }

  /** give object back immediately */
  release(o) {
    const i = this.used.indexOf(o);
    if (i >= 0) {
      this.used[i] = this.used[this.used.length - 1];
      this.used.pop();
    }
    if (this.reset) this.reset(o);
    if (this.free.indexOf(o) < 0) this.free.push(o);
  }

  /** move every dead object (alive === false) back to the free list */
  sweep() {
    for (let i = this.used.length - 1; i >= 0; i--) {
      const o = this.used[i];
      if (o.alive === false) {
        this.used[i] = this.used[this.used.length - 1];
        this.used.pop();
        if (this.reset) this.reset(o);
        this.free.push(o);
      }
    }
  }

  /** drop everything (screen clear / new run) */
  clear() {
    while (this.used.length) {
      const o = this.used.pop();
      if (this.reset) this.reset(o);
      this.free.push(o);
    }
  }

  forEach(fn) {
    const arr = this.used;
    for (let i = 0; i < arr.length; i++) fn(arr[i], i);
  }

  get size() { return this.used.length; }
  get live() {
    let n = 0;
    for (let i = 0; i < this.used.length; i++) if (this.used[i].alive !== false) n++;
    return n;
  }
}
