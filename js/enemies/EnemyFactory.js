'use strict';

/* ============================================================
   ABSTRACT FACTORY for attacks.

   EnemyFactory        — abstract base (cannot be instantiated,
                         declares the contract).
   DoodleEnemyFactory  — concrete factory: registers all 25
                         attack classes, reuses instances
                         (per-type free lists = zero allocation)
                         and performs weighted type selection.
   ============================================================ */

class EnemyFactory {
  constructor() {
    if (new.target === EnemyFactory) {
      throw new Error('EnemyFactory is abstract — use DoodleEnemyFactory');
    }
  }
  /** @returns {Enemy} */
  create(type, params) { throw new Error('abstract EnemyFactory.create()'); }
  release(enemy) { throw new Error('abstract EnemyFactory.release()'); }
  meta(type) { throw new Error('abstract EnemyFactory.meta()'); }
}

class DoodleEnemyFactory extends EnemyFactory {
  constructor(game) {
    super();
    this.game = game;
    this.defs = new Map(); // type -> {Class, meta, free[], all[]}
  }

  /** @param {Function} ClassRef subclass of Enemy */
  define(type, ClassRef, meta = {}) {
    this.defs.set(type, {
      Class: ClassRef,
      meta: Object.assign({
        label: type.toUpperCase(),
        family: 'hazard',
        unlock: 0,
        weight: 8
      }, meta),
      free: [],
      all: []
    });
    return this;
  }

  supports(type) { return this.defs.has(type); }

  create(type, params = {}) {
    const def = this.defs.get(type);
    if (!def) throw new Error('Unknown attack type: ' + type);
    let e = def.free.pop();
    if (!e) {
      e = new def.Class(this.game);
      def.all.push(e);
    }
    e.factoryType = type;
    e.init(params);
    return e;
  }

  release(enemy) {
    const def = this.defs.get(enemy.factoryType);
    if (!def) return;
    enemy.active = false;
    enemy.dead = false;
    if (def.free.indexOf(enemy) < 0) def.free.push(enemy);
  }

  meta(type) {
    const def = this.defs.get(type);
    return def ? def.meta : { label: type, family: 'hazard' };
  }

  /** attack types unlocked at the given survival time */
  unlocked(elapsed, avoidType) {
    const out = [];
    for (const [type, def] of this.defs) {
      if (def.meta.unlock <= elapsed && type !== avoidType) out.push([type, def.meta]);
    }
    if (!out.length) {
      for (const [type, def] of this.defs) {
        if (def.meta.unlock <= elapsed) out.push([type, def.meta]);
      }
    }
    return out;
  }

  /** weighted random attack selection (abstract-factory entry point) */
  pick(elapsed, avoidType) {
    const list = this.unlocked(elapsed, avoidType);
    if (!list.length) return null;
    let total = 0;
    for (const [, m] of list) total += m.weight;
    let r = Math.random() * total;
    for (const [type, m] of list) {
      r -= m.weight;
      if (r <= 0) return type;
    }
    return list[0][0];
  }

  /** statistics / debug */
  stats() {
    let instances = 0, free = 0;
    for (const def of this.defs.values()) { instances += def.all.length; free += def.free.length; }
    return { types: this.defs.size, instances, free };
  }
}

/** register all 11 attack classes with their spawn metadata */
function registerAllAttacks(factory) {
  factory.define('laser', CurvedLaserAttack, { label: 'CURVED LASERS', family: 'beam', unlock: 0, weight: 11 });
  factory.define('rain', InkRainAttack, { label: 'INK RAIN', family: 'bullet', unlock: 3, weight: 10 });
  factory.define('spiral', SpiralFountainAttack, { label: 'SPIRAL FOUNTAIN', family: 'bullet', unlock: 6, weight: 8 });
  factory.define('hole', BlackHoleAttack, { label: 'BLACK HOLE', family: 'field', unlock: 8, weight: 7 });
  factory.define('arrows', ChevronStampedeAttack, { label: 'CHEVRON STAMPEDE', family: 'bullet', unlock: 11, weight: 8 });
  factory.define('eye', FlyingEyeAttack, { label: 'FLYING EYES', family: 'entity', unlock: 14, weight: 8 });
  factory.define('lightning', LightningStrikeAttack, { label: 'LIGHTNING', family: 'beam', unlock: 17, weight: 8 });
  factory.define('cross', SpinningCrossAttack, { label: 'SPINNING CROSS', family: 'beam', unlock: 20, weight: 6 });
  factory.define('saws', OrbitingSawsAttack, { label: 'ORBITING SAWS', family: 'entity', unlock: 23, weight: 7 });
  factory.define('mine', InkMineAttack, { label: 'INK MINES', family: 'bullet', unlock: 26, weight: 8 });
  factory.define('puddles', InkPuddlesAttack, { label: 'INK PUDDLES', family: 'field', unlock: 29, weight: 7 });
  factory.define('snake', HomingSquiggleAttack, { label: 'HOMING SQUIGGLES', family: 'chase', unlock: 32, weight: 8 });
  factory.define('vines', CreepingVinesAttack, { label: 'CREEPING VINES', family: 'field', unlock: 35, weight: 7 });
  factory.define('wall', TextWallAttack, { label: 'TEXT WALL', family: 'bullet', unlock: 38, weight: 6 });
  factory.define('bouncers', BouncingOrbsAttack, { label: 'BOUNCING ORBS', family: 'bullet', unlock: 42, weight: 8 });
  factory.define('scissors', CrazyScissorsAttack, { label: 'CRAZY SCISSORS', family: 'chase', unlock: 46, weight: 7 });
  factory.define('anvil', FallingBlocksAttack, { label: 'FALLING BLOCKS', family: 'bullet', unlock: 50, weight: 7 });
  factory.define('grid', AxisGridAttack, { label: 'AXIS GRID', family: 'field', unlock: 54, weight: 7 });
  factory.define('press', ClosingPressAttack, { label: 'CLOSING PRESS', family: 'field', unlock: 58, weight: 7 });
  factory.define('swarm', ChaoticSwarmAttack, { label: 'CHAOTIC SWARM', family: 'swarm', unlock: 62, weight: 8 });
  factory.define('clock', ClockAttack, { label: 'CLOCKWORK', family: 'field', unlock: 56, weight: 6 });
  factory.define('meteor', MeteorAttack, { label: 'METEOR', family: 'bullet', unlock: 60, weight: 6 });
  factory.define('ghost', GhostAttack, { label: 'GHOSTLY WAIL', family: 'entity', unlock: 64, weight: 6 });
  factory.define('tornado', TornadoAttack, { label: 'TORNADO', family: 'field', unlock: 68, weight: 6 });
  factory.define('cannon', CannonAttack, { label: 'INK CANNON', family: 'bullet', unlock: 72, weight: 6 });
}
