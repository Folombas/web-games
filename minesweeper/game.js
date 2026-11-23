'use strict';

/* Сапёр: первый клик безопасен, флажки (ПКМ/долгий тап/режим), таймер, рекорд в localStorage. */
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const minesEl = document.getElementById('minesLeft');
const timerEl = document.getElementById('timer');
const bestEl = document.getElementById('best');
const diffEl = document.getElementById('difficulty');
const newGameBtn = document.getElementById('newGame');
const flagModeBtn = document.getElementById('flagMode');

const SIZES = { small: { n: 9, mines: 10, key: 'wg-mines-best-9' }, big: { n: 10, mines: 20, key: 'wg-mines-best-10' } };
const NUM_COLORS = ['', '#7c9cff', '#4dd4ac', '#ffd166', '#ff9f6b', '#ff6b81', '#b296ff', '#ff96a6', '#c8d3f5'];

let N = 9, MINES = 10, BEST_KEY = SIZES.small.key;
let cells = [];        // {mine, open, flag, near, el}
let started = false, over = false;
let flags = 0, opened = 0;
let seconds = 0, tick = null;
let flagMode = false;

function status(t) { statusEl.textContent = t; }

function idx(r, c) { return r * N + c; }
function neighbors(i) {
  const r = Math.floor(i / N), c = i % N;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N) out.push(idx(nr, nc));
  }
  return out;
}

function build() {
  const cfg = SIZES[diffEl.value];
  N = cfg.n; MINES = cfg.mines; BEST_KEY = cfg.key;
  cells = [];
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = 'repeat(' + N + ', var(--ms-cell))';
  for (let i = 0; i < N * N; i++) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ms-cell';
    el.dataset.i = String(i);
    el.setAttribute('aria-label', 'Клетка ' + (i + 1) + ', закрыта');
    boardEl.appendChild(el);
    cells.push({ mine: false, open: false, flag: false, near: 0, el });
  }
  started = false; over = false; flags = 0; opened = 0; seconds = 0;
  clearInterval(tick);
  timerEl.textContent = '0';
  minesEl.textContent = String(MINES);
  const best = localStorage.getItem(BEST_KEY);
  bestEl.textContent = best ? Math.round(Number(best) / 1000) + ' с' : '—';
  status('Открой первую клетку');
}

function placeMines(safe) {
  const banned = new Set([safe, ...neighbors(safe)]);
  let placed = 0;
  while (placed < MINES) {
    const i = Math.floor(Math.random() * N * N);
    if (banned.has(i) || cells[i].mine) continue;
    cells[i].mine = true;
    placed++;
  }
  cells.forEach((cell, i) => {
    cell.near = neighbors(i).filter((j) => cells[j].mine).length;
  });
}

function paint(cell, i) {
  const el = cell.el;
  el.classList.toggle('is-open', cell.open);
  el.classList.toggle('is-flag', cell.flag && !cell.open);
  if (cell.open) {
    el.disabled = true;
    if (cell.mine) { el.textContent = '💥'; el.classList.add('is-mine'); }
    else if (cell.near) { el.textContent = String(cell.near); el.style.color = NUM_COLORS[cell.near]; }
    else el.textContent = '';
    el.setAttribute('aria-label', 'Клетка ' + (i + 1) + (cell.mine ? ', мина' : cell.near ? ', мин рядом: ' + cell.near : ', пусто'));
  } else {
    el.textContent = cell.flag ? '🚩' : '';
    el.setAttribute('aria-label', 'Клетка ' + (i + 1) + (cell.flag ? ', флажок' : ', закрыта'));
  }
}

function startTimer() {
  const t0 = Date.now();
  tick = setInterval(() => {
    seconds = Math.round((Date.now() - t0) / 1000);
    timerEl.textContent = String(seconds);
  }, 250);
}

function reveal(i) {
  const cell = cells[i];
  if (cell.open || cell.flag || over) return;
  if (!started) {
    started = true;
    placeMines(i);
    startTimer();
    status('Игра идёт');
  }
  cell.open = true;
  opened++;
  if (cell.mine) { lose(cell); return; }
  if (cell.near === 0) neighbors(i).forEach((j) => reveal(j));
  paint(cell, i);
  checkWin();
}

function toggleFlag(i) {
  const cell = cells[i];
  if (cell.open || over) return;
  cell.flag = !cell.flag;
  flags += cell.flag ? 1 : -1;
  minesEl.textContent = String(MINES - flags);
  paint(cell, i);
}

function lose(hit) {
  over = true;
  clearInterval(tick);
  cells.forEach((c, i) => {
    if (c.mine) { c.open = true; paint(c, i); }
  });
  hit.el.classList.add('is-hit');
  paint(hit, cells.indexOf(hit));
  status('💥 Мина! Партия проиграна за ' + seconds + ' с');
}

function checkWin() {
  if (over || opened !== N * N - MINES) return;
  over = true;
  clearInterval(tick);
  cells.forEach((c, i) => { if (c.mine && !c.flag) { c.flag = true; flags++; paint(c, i); } });
  minesEl.textContent = '0';
  const best = Number(localStorage.getItem(BEST_KEY)) || Infinity;
  const elapsed = seconds * 1000;
  if (elapsed < best) {
    localStorage.setItem(BEST_KEY, String(elapsed));
    bestEl.textContent = seconds + ' с · новый рекорд!';
  } else {
    bestEl.textContent = Math.round(best / 1000) + ' с';
  }
  status('🏆 Победа за ' + seconds + ' с!');
}

boardEl.addEventListener('click', (e) => {
  const el = e.target.closest('.ms-cell');
  if (!el) return;
  const i = Number(el.dataset.i);
  if (flagMode) toggleFlag(i); else reveal(i);
});
boardEl.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const el = e.target.closest('.ms-cell');
  if (el) toggleFlag(Number(el.dataset.i));
});
// Долгий тап = флажок
let pressTimer = null;
boardEl.addEventListener('touchstart', (e) => {
  const el = e.target.closest('.ms-cell');
  if (!el) return;
  pressTimer = setTimeout(() => { toggleFlag(Number(el.dataset.i)); pressTimer = null; }, 450);
}, { passive: true });
boardEl.addEventListener('touchend', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });
boardEl.addEventListener('touchmove', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });

flagModeBtn.addEventListener('click', () => {
  flagMode = !flagMode;
  flagModeBtn.setAttribute('aria-pressed', String(flagMode));
  flagModeBtn.classList.toggle('is-active', flagMode);
  status(flagMode ? 'Режим флажка: клик ставит флажок' : 'Обычный режим: клик открывает клетку');
});
newGameBtn.addEventListener('click', build);
diffEl.addEventListener('change', build);

build();
