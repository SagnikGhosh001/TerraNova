import { Game } from './game/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  // Initialize and run Terra Nova
  const game = new Game();
  window.__terraNovaGame = game;
});
