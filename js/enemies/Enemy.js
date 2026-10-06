'use strict';

/* ============================================================
   Enemy — abstract base class for every attack.
   All 11 attack classes extend it and are created/reused by
   DoodleEnemyFactory and driven by SpawnManager.
   ============================================================ */

class Enemy {
  /** @type {String} unique attack id */
  static type = 'enemy';
  /** @type {String} family: beam | field | entity | bullet | chase | swarm */
  static family = 'hazard';

  constructor(game) {
    this.game = game;
    this.active = false;
    this.dead = false;
    this.age = 0;
    this.seed = 0;
    this.params = {};
    this.factoryType = '';
    this.label = 'ATTACK';
  }

  /** called by the factory on every (re)use */
  init(params = {}) {
    this.active = true;
    this.dead = false;
    this.age = 0;
    this.seed = rnd(1000);
    this.params = params;
    return this;
  }

  update(dt) { this.age += dt; }

  draw(ctx) {}

  /** hazard contact test against the player's micro-hitbox */
  hitTest(x, y) { return false; }

  /** mark as finished — SpawnManager releases it to the factory */
  finish() {
    this.dead = true;
    this.active = false;
  }

  get done() { return this.dead; }

  /* helpers shared by attacks */

  get w() { return this.game.w; }
  get h() { return this.game.h; }
  get diff() { return this.game.difficulty; }

  /** grey warning flash + shake when an attack actually fires */
  fireFlash(shake = 6) {
    this.game.renderer.addShake(shake);
    this.game.renderer.addFlash(0.12);
  }

  sparks(x, y, n = 6) {
    this.game.bullets.burst(x, y, n, { s0: 40, s1: 220, life: 0.5, size: 3.4, g: rint(90, 170) });
  }
}
