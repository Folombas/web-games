'use strict';

import { loadBest, saveBest, onSwipe, randomInt } from '../js/core.js';

/* Змейка: canvas-рендер, стрелки/WASD, свайпы, пауза (Space), рестарт (R), рекорд в localStorage. */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

const GRID = 20;
const TICK = 120;
const BEST_KEY = 'wg-snake-best';

const state = {
  snake: [], dir: { x: 1, y: 0 }, queue: [], food: null,
  score: 0, best: loadBest(BEST_KEY),
  running: false, paused: false, ateFood: false,
};

function status(text) { statusEl.textContent = text; }

function spawnFood() {
  const occupied = new Set(state.snake.map((cell) => cell.y * GRID + cell.x));
  const free = [];
  for (let i = 0; i < GRID * GRID; i++) if (!occupied.has(i)) free.push(i);
  if (!free.length) {
    state.food = null;
    state.running = false;
    if (state.score > state.best) {
      state.best = state.score;
      saveBest(BEST_KEY, state.best);
    }
    bestEl.textContent = String(state.best);
    status('🏆 Поле заполнено полностью — идеальная игра! Рекорд: ' + state.best + '. Нажми R, чтобы заново');
    draw();
    return;
  }
  const i = free[randomInt(free.length)];
  state.food = { x: i % GRID, y: Math.floor(i / GRID) };
}

function reset() {
  state.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  state.dir = { x: 1, y: 0 };
  state.queue = [];
  state.score = 0;
  state.paused = false;
  state.running = false;
  spawnFood();
  bestEl.textContent = String(state.best);
  scoreEl.textContent = '0';
  status('Нажми стрелку/WASD или свайпни, чтобы начать');
  draw();
}

function step() {
  if (state.queue.length) {
    const next = state.queue.shift();
    if (next.x !== -state.dir.x || next.y !== -state.dir.y) state.dir = next;
  }
  const head = state.snake[0];
  const nh = { x: head.x + state.dir.x, y: head.y + state.dir.y };
  // Стены и собственный хвост (хвост уйдёт в this шаг, если не съели)
  const ate = state.food && nh.x === state.food.x && nh.y === state.food.y;
  const body = ate ? state.snake : state.snake.slice(0, -1);
  if (nh.x < 0 || nh.y < 0 || nh.x >= GRID || nh.y >= GRID ||
      body.some((s) => s.x === nh.x && s.y === nh.y)) {
    state.running = false;
    if (state.score > state.best) {
      state.best = state.score;
      saveBest(BEST_KEY, state.best);
    }
    bestEl.textContent = String(state.best);
    status('Игра окончена. Рекорд: ' + state.best + '. Нажми R, чтобы заново');
    draw(nh);
    return;
  }
  state.snake.unshift(nh);
  if (ate) {
    state.score += 10;
    scoreEl.textContent = String(state.score);
    spawnFood();
  } else {
    state.snake.pop();
  }
  draw();
}

function draw(deadAt) {
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // сетка
  ctx.strokeStyle = 'rgba(124,156,255,0.07)';
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * 20, 0); ctx.lineTo(i * 20, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 20); ctx.lineTo(canvas.width, i * 20); ctx.stroke();
  }
  // еда
  if (state.food) {
    ctx.fillStyle = '#ff6b81';
    ctx.beginPath();
    ctx.arc(state.food.x * 20 + 10, state.food.y * 20 + 10, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // змейка
  state.snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#4dd4ac' : 'rgba(124,156,255,' + Math.max(0.35, 1 - i / state.snake.length) + ')';
    ctx.beginPath();
    ctx.roundRect(s.x * 20 + 2, s.y * 20 + 2, 16, 16, 5);
    ctx.fill();
  });
  if (deadAt) {
    ctx.fillStyle = '#ff6b81';
    ctx.beginPath();
    ctx.roundRect(deadAt.x * 20 + 2, deadAt.y * 20 + 2, 16, 16, 5);
    ctx.fill();
  }
}

function turn(x, y) {
  if (!state.running) {
    if (!state.snake.length) reset();
    state.running = true;
    state.paused = false;
    status('Игра идёт');
  }
  if (state.paused) return;
  state.queue.push({ x, y });
  if (state.queue.length > 3) state.queue.length = 3;
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? '▶ Продолжить' : '⏸ Пауза';
  status(state.paused ? 'Пауза (Space, чтобы продолжить)' : 'Игра идёт');
}

setInterval(() => { if (state.running && !state.paused) step(); }, TICK);

const KEY_DIRS = {
  ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
};
window.addEventListener('keydown', (e) => {
  if (KEY_DIRS[e.code]) { e.preventDefault(); turn(KEY_DIRS[e.code].x, KEY_DIRS[e.code].y); }
  else if (e.code === 'Space') { e.preventDefault(); togglePause(); }
  else if (e.code === 'KeyR') { e.preventDefault(); reset(); }
});

// Свайпы на мобильных
onSwipe((dx, dy) => {
  if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
  else turn(0, dy > 0 ? 1 : -1);
});

pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', reset);
reset();
