'use strict';

/* alone star — entry point */

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  window.GAME = new Game(canvas);
  requestAnimationFrame(GAME.loop);
});

window.addEventListener('resize', () => {
  if (window.GAME) GAME.resize();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && window.GAME && GAME.state === 'playing') GAME.paused = true;
});
