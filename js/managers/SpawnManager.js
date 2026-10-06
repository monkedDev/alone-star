'use strict';

/* ============================================================
   SpawnManager — schedules attacks, owns the live enemy list,
   scales parameters with difficulty and releases finished
   enemies back to the factory (instance reuse).
   ============================================================ */

class SpawnManager {
  constructor(game, factory) {
    this.game = game;
    this.factory = factory;
    this.enemies = [];
    this.cooldown = 1.9;   // -0.3s: attacks come more often
    this.elapsed = 0;
    this.lastType = '';
    this.spawned = 0;
    this.maxConcurrent = 5;
    // anti-repeat memory: the last few attack types are avoided
    this.recents = [];
    this.lastSeen = {};    // type -> spawn elapsed (for freshness weighting)
  }

  reset() {
    for (const e of this.enemies) this.factory.release(e);
    this.enemies.length = 0;
    this.cooldown = 1.9;
    this.elapsed = 0;
    this.lastType = '';
    this.spawned = 0;
    this.recents.length = 0;
    this.lastSeen = {};
  }

  spawn(type, params = {}) {
    const e = this.factory.create(type, params);
    if (this.enemies.indexOf(e) < 0) this.enemies.push(e);
    this.game.notify(this.factory.meta(type).label);
    this.spawned++;
    this.lastSeen[type] = this.elapsed;
    // remember recent types (max 4) so repeats feel rarer
    this.recents.push(type);
    if (this.recents.length > 4) this.recents.shift();
    return e;
  }

  unlockedTypes(elapsed) {
    const out = [];
    for (const [t, def] of this.factory.defs) {
      if (def.meta.unlock <= elapsed) out.push([t, def.meta]);
    }
    return out;
  }

  /** freshness: long-unseen types get a big weight boost */
  weight(t, meta) {
    const idle = this.elapsed - (t in this.lastSeen ? this.lastSeen[t] : 0);
    return meta.weight * (1 + Math.min(2.5, Math.max(0, idle) / 18));
  }

  /** weighted pick, avoiding the recent memory when enough options exist */
  pickType(avoid = []) {
    const list = this.unlockedTypes(this.elapsed);
    if (!list.length) return null;

    let pool = list.filter(([t]) => avoid.indexOf(t) < 0 && this.recents.indexOf(t) < 0);
    // only give up the recent-memory when there is literally nothing left
    if (pool.length === 0) pool = list.filter(([t]) => avoid.indexOf(t) < 0);
    if (pool.length === 0) pool = list;

    let total = 0;
    const w = pool.map(([t, m]) => {
      const ww = this.weight(t, m);
      total += ww;
      return [t, ww];
    });
    let r = Math.random() * total;
    for (const [t, ww] of w) {
      r -= ww;
      if (r <= 0) return t;
    }
    return w[0][0];
  }

  /** occasional paired spawn from a DIFFERENT family = extra variety */
  tryCombo(first) {
    const g = this.game;
    const diff = g.difficulty;
    // combo may briefly bump past the cap by one slot (still bounded)
    if (this.enemies.length >= this.maxConcurrent + 1) return;
    if (diff < 1.5) return;
    if (!chance(0.22 + Math.min(0.16, (diff - 1) * 0.05))) return;

    const fam = this.factory.meta(first).family;
    const pool = this.unlockedTypes(this.elapsed).filter(
      ([t, m]) => m.family !== fam && t !== first && this.recents.indexOf(t) < 0);
    if (!pool.length) return;

    let total = 0;
    const w = pool.map(([t, m]) => { const ww = this.weight(t, m); total += ww; return [t, ww]; });
    let r = Math.random() * total;
    for (const [t, ww] of w) { r -= ww; if (r <= 0) { this.spawn(t, this.buildParams(t, diff)); return; } }
  }

  buildParams(type, diff) {
    switch (type) {
      case 'eye':
        return { count: 1 + (diff > 2 ? 1 : 0) + (diff > 3.6 ? 1 : 0), variant: rint(0, 2) };
      case 'mine': // buff: more mines earlier
        return { count: 1 + (diff > 1.6 ? 1 : 0) + (diff > 3 ? 2 : 0) };
      case 'snake':
        return { count: 1 + (diff > 2.8 ? 1 : 0) + (diff > 4.5 ? 1 : 0) };
      case 'rain':
        return { duration: Math.min(9, 5 + diff * 0.6), variant: rint(0, 2) };
      case 'wall':
        return { duration: Math.min(7, 5 + diff * 0.3), variant: rint(0, 2) };
      case 'laser': // buff: multi-beam
        return { count: 1 + (diff > 1.8 ? 1 : 0) + (diff > 3.2 ? 1 : 0), variant: rint(0, 2) };
      case 'saws':
        return { count: 2 + (diff > 2.6 ? 1 : 0) + (diff > 4.2 ? 1 : 0) };
      case 'spiral':
        return { variant: rint(0, 2) };
      case 'arrows':
        return { variant: rint(0, 2) };
      case 'press':
        return { variant: rint(0, 1) };
      case 'puddles':
        return { count: 2 + (diff > 2.4 ? 1 : 0) + (diff > 4 ? 1 : 0) };
      case 'vines':
        return { count: 2 + (diff > 3 ? 1 : 0) };
      case 'bouncers':
        return { count: Math.min(14, 5 + Math.round((diff - 1) * 2.5)) };
      default:
        return {};
    }
  }

  update(dt) {
    this.elapsed += dt;
    const g = this.game;
    const diff = g.difficulty;

    this.cooldown -= dt;
    if (this.cooldown <= 0 && this.enemies.length < this.maxConcurrent) {
      const avoid = this.lastType ? [this.lastType] : [];
      const type = this.pickType(avoid);
      if (type) {
        this.spawn(type, this.buildParams(type, diff));
        this.lastType = type;
        this.tryCombo(type);
        // -0.3s vs the original pacing
        this.cooldown = clamp(rnd(1.8, 3.1) / (0.7 + diff * 0.5) - 0.3, 0.25, 3.2);
      } else {
        this.cooldown = 1;
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt);
      if (e.dead) {
        this.enemies.splice(i, 1);
        this.factory.release(e);
      }
    }
  }

  draw(ctx) {
    for (const e of this.enemies) e.draw(ctx);
  }

  /** any active hazard touching the micro-hitbox? */
  hitTest(x, y) {
    for (const e of this.enemies) {
      if (e.hitTest(x, y)) return true;
    }
    return false;
  }
}
