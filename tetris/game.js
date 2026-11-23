'use strict';

/* Тетрис: 7 фигур, вращение, превью, очки 100/300/500/800, нарастающая скорость. */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const preview = document.getElementById('preview');
const pctx = preview.getContext('2d');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const bestEl = document.getElementById('best');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

const COLS = 10, ROWS = 20, CELL = 22;
const BEST_KEY = 'wg-tetris-best';

const SHAPES = {
  I: { color: '#4dd4ac', cells: [[1, 0], [1, 1], [1, 2], [1, 3]] },
  O: { color: '#ffd166', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  T: { color: '#b296ff', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  S: { color: '#7bd88f', cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  Z: { color: '#ff6b81', cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  J: { color: '#7c9cff', cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
  L: { color: '#ff9f6b', cells: [[0, 2], [1, 0], [1, 1], [1, 2]] },
};
const NAMES = Object.keys(SHAPES);
const LINE_SCORE = [0, 100, 300, 500, 800];

let field = [];
let piece = null;
let nextName = null;
let score = 0, lines = 0, best = Number(localStorage.getItem(BEST_KEY)) || 0;
let running = false, paused = false, timer = null;

function status(t) { statusEl.textContent = t; }
bestEl.textContent = String(best);

function emptyField() { return Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }

function rotateCells(cells) {
  const maxR = Math.max(...cells.map((x) => x[0]));
  return cells.map(([r, c]) => [c, maxR - r]);
}

function collide(cells, r0, c0) {
  return cells.some(([r, c]) => {
    const nr = r0 + r, nc = c0 + c;
    if (nc < 0 || nc >= COLS || nr >= ROWS) return true;
    if (nr >= 0 && field[nr][nc]) return true;
    return false;
  });
}

function spawn() {
  const name = nextName || NAMES[Math.floor(Math.random() * NAMES.length)];
  nextName = NAMES[Math.floor(Math.random() * NAMES.length)];
  piece = { name, cells: SHAPES[name].cells, r: -1, c: Math.floor((COLS - 4) / 2) + 1 };
  drawPreview();
  if (collide(piece.cells, piece.r + 1, piece.c)) { gameOver(); return; }
  draw();
}

function lock() {
  piece.cells.forEach(([r, c]) => {
    const nr = piece.r + r, nc = piece.c + c;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) field[nr][nc] = SHAPES[piece.name].color;
  });
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (field[r].every(Boolean)) {
      field.splice(r, 1);
      field.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    score += LINE_SCORE[cleared];
    lines += cleared;
    scoreEl.textContent = String(score);
    linesEl.textContent = String(lines);
    if (score > best) { best = score; localStorage.setItem(BEST_KEY, String(best)); bestEl.textContent = String(best); }
    status(cleared >= 4 ? '🎮 Тетрис! +' + LINE_SCORE[4] : '+' + LINE_SCORE[cleared]);
    restartTimer();
  }
  spawn();
}

function tickInterval() { return Math.max(150, 800 - Math.floor(lines / 10) * 75); }
function restartTimer() {
  clearTimeout(timer);
  timer = setTimeout(function loop() {
    tick();
    if (running && !paused) { clearTimeout(timer); timer = setTimeout(loop, tickInterval()); }
  }, tickInterval());
}

function tick() {
  if (paused || !running) return;
  if (!collide(piece.cells, piece.r + 1, piece.c)) {
    piece.r++;
    draw();
  } else {
    lock();
  }
}

function drawCell(c2, r, c, color) {
  c2.fillStyle = color;
  c2.beginPath();
  c2.roundRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2, 4);
  c2.fill();
}

function draw() {
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  field.forEach((row, r) => row.forEach((color, c) => { if (color) drawCell(ctx, r, c, color); }));
  if (piece && running) piece.cells.forEach(([r, c]) => {
    const nr = piece.r + r, nc = piece.c + c;
    if (nr >= 0) drawCell(ctx, nr, nc, SHAPES[piece.name].color);
  });
}

function drawPreview() {
  pctx.fillStyle = '#0b0e1a';
  pctx.fillRect(0, 0, preview.width, preview.height);
  if (!nextName) return;
  const cells = SHAPES[nextName].cells;
  const maxR = Math.max(...cells.map((x) => x[0])), maxC = Math.max(...cells.map((x) => x[1]));
  const offR = (4 - maxR) / 2, offC = (4 - maxC) / 2;
  cells.forEach(([r, c]) => {
    pctx.fillStyle = SHAPES[nextName].color;
    pctx.beginPath();
    pctx.roundRect((offC + c) * 24 + 2, (offR + r) * 24 + 2, 20, 20, 4);
    pctx.fill();
  });
}

function gameOver() {
  running = false;
  clearTimeout(timer);
  if (score > best) { best = score; localStorage.setItem(BEST_KEY, String(best)); bestEl.textContent = String(best); }
  status('Игра окончена. Очки: ' + score + '. Нажми «Заново»');
  draw();
}

function start() {
  field = emptyField();
  score = 0; lines = 0;
  scoreEl.textContent = '0'; linesEl.textContent = '0';
  nextName = null;
  paused = false;
  pauseBtn.textContent = '⏸ Пауза';
  running = true;
  status('Игра идёт');
  draw();
  spawn();
  restartTimer();
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? '▶ Продолжить' : '⏸ Пауза';
  status(paused ? 'Пауза (P, чтобы продолжить)' : 'Игра идёт');
}

window.addEventListener('keydown', (e) => {
  if (!running || paused) {
    if (e.code === 'KeyP' && running) { e.preventDefault(); togglePause(); }
    if (e.code === 'KeyR') { e.preventDefault(); start(); }
    return;
  }
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA':
      e.preventDefault();
      if (!collide(piece.cells, piece.r, piece.c - 1)) { piece.c--; draw(); }
      break;
    case 'ArrowRight': case 'KeyD':
      e.preventDefault();
      if (!collide(piece.cells, piece.r, piece.c + 1)) { piece.c++; draw(); }
      break;
    case 'ArrowDown': case 'KeyS':
      e.preventDefault();
      if (!collide(piece.cells, piece.r + 1, piece.c)) { piece.r++; draw(); }
      break;
    case 'ArrowUp': case 'KeyW': {
      e.preventDefault();
      const rotated = rotateCells(piece.cells);
      if (!collide(rotated, piece.r, piece.c)) { piece.cells = rotated; draw(); }
      break;
    }
    case 'Space': {
      e.preventDefault();
      while (!collide(piece.cells, piece.r + 1, piece.c)) piece.r++;
      lock();
      break;
    }
    case 'KeyP':
      e.preventDefault();
      togglePause();
      break;
    case 'KeyR':
      e.preventDefault();
      start();
      break;
  }
});

pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', start);
field = emptyField();
draw();
start();
