'use strict';

import { loadNumber, saveBest, onSwipe, randomInt } from '../js/core.js';

/* 2048: классические правила, стрелки/WASD + свайпы, счёт и рекорд в localStorage. */
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const newGameBtn = document.getElementById('newGame');

const SIZE = 4;
const K = (s) => 'wg-2048-' + s;

const tiles = new Map(); // id -> {v, r, c, el, dead}
let grid = [];           // grid[r][c] = id | null
let score = 0, best = 0, won = false, idSeq = 0;

const COLORS = {
  2: '#3b4468', 4: '#465380', 8: '#7c9cff', 16: '#5e7dff', 32: '#4dd4ac', 64: '#2fb894',
  128: '#b296ff', 256: '#9a72ff', 512: '#8655ff', 1024: '#ff96a6', 2048: '#ff6b81',
};

function status(t) { statusEl.textContent = t; }
function loadScores() { best = loadNumber(K('best'), 0); }
function saveScore() {
  localStorage.setItem(K('score'), String(score));
  if (score > best) best = score;
  saveBest(K('best'), best);
}

function saveState() {
  const m = grid.map((row) => row.map((id) => (id ? tiles.get(id).v : 0)));
  localStorage.setItem(K('state'), JSON.stringify({ m, score }));
}

function loadState() {
  const raw = localStorage.getItem(K('state'));
  if (!raw) return false;
  let s;
  try { s = JSON.parse(raw); } catch (e) { return false; }
  if (!s || !Array.isArray(s.m) || s.m.length !== SIZE) return false;
  tiles.clear();
  grid = s.m.map((row, r) => row.map((v, c) => (v ? makeNewTile(r, c, Number(v)) : null)));
  score = Number(s.score) || 0;
  won = grid.some((row) => row.some((id) => id && tiles.get(id).v >= 2048));
  return true;
}

function posOf(r, c) { return { left: (c * 26) + '%', top: (r * 26) + '%' }; }

function drawBg() {
  boardEl.querySelectorAll('.cell-bg').forEach((x) => x.remove());
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const bg = document.createElement('div');
    bg.className = 'cell-bg';
    Object.assign(bg.style, posOf(r, c));
    boardEl.appendChild(bg);
  }
}

function render() {
  for (const [id, t] of [...tiles]) {
    if (t.dead) { t.el.remove(); tiles.delete(id); continue; }
    Object.assign(t.el.style, posOf(t.r, t.c));
    t.el.style.background = COLORS[t.v] || '#ff6b81';
    t.el.style.color = t.v >= 32 ? '#0b0e1a' : '#eef1ff';
    t.el.textContent = String(t.v);
  }
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
}

function makeNewTile(r, c, v, cls) {
  const el = document.createElement('div');
  el.className = 'tile' + (cls ? ' ' + cls : '');
  Object.assign(el.style, posOf(r, c));
  boardEl.appendChild(el);
  const id = ++idSeq;
  tiles.set(id, { v, r, c, el, dead: false });
  return id;
}

function freeCells() {
  const out = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) out.push([r, c]);
  return out;
}

function addRandomTile() {
  const free = freeCells();
  if (!free.length) return;
  const [r, c] = free[randomInt(free.length)];
  grid[r][c] = makeNewTile(r, c, Math.random() < 0.9 ? 2 : 4, 'new');
}

function restart() {
  tiles.forEach((t) => t.el.remove());
  tiles.clear();
  localStorage.removeItem(K('state'));
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  loadScores();
  score = 0;
  saveScore();
  won = false;
  addRandomTile();
  addRandomTile();
  saveState();
  status('Двигай плитки: стрелки, WASD или свайпы');
  render();
}

function lineCells(dir, i) {
  const out = [];
  for (let j = 0; j < SIZE; j++) {
    const r = dir.dr === 0 ? i : (dir.dr === -1 ? j : SIZE - 1 - j);
    const c = dir.dc === 0 ? i : (dir.dc === -1 ? j : SIZE - 1 - j);
    out.push([r, c, grid[r][c]]);
  }
  return out;
}

function canMerge() {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const id = grid[r][c];
    if (!id) continue;
    const v = tiles.get(id).v;
    if (c + 1 < SIZE && grid[r][c + 1] && tiles.get(grid[r][c + 1]).v === v) return true;
    if (r + 1 < SIZE && grid[r + 1][c] && tiles.get(grid[r + 1][c]).v === v) return true;
  }
  return false;
}

function doMove(dir) {
  let moved = false;
  let gained = 0;
  const mergedNotes = []; // [r, c, v]
  const placed = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

  for (let i = 0; i < SIZE; i++) {
    const line = lineCells(dir, i);
    const ids = line.map((x) => x[2]).filter(Boolean);
    const out = [];
    for (let k = 0; k < ids.length; k++) {
      const a = tiles.get(ids[k]);
      if (k + 1 < ids.length) {
        const b = tiles.get(ids[k + 1]);
        if (a.v === b.v) {
          out.push({ merge: [ids[k], ids[k + 1]], v: a.v * 2 });
          gained += a.v * 2;
          k++;
          continue;
        }
      }
      out.push({ id: ids[k], v: a.v });
    }
    for (let idx = 0; idx < out.length; idx++) {
      const cell = line[idx];
      const destR = dir.dr === 0 ? cell[0] : (dir.dr === -1 ? idx : SIZE - 1 - idx);
      const destC = dir.dc === 0 ? cell[1] : (dir.dc === -1 ? idx : SIZE - 1 - idx);
      const o = out[idx];
      if (o.merge) {
        moved = true;
        o.merge.forEach((id) => {
          const t = tiles.get(id);
          t.dead = true;
          t.r = destR; t.c = destC;
        });
        mergedNotes.push([destR, destC, o.v]);
      } else {
        const t = tiles.get(o.id);
        if (t.r !== destR || t.c !== destC) moved = true;
        t.r = destR; t.c = destC;
        placed[destR][destC] = o.id;
      }
    }
  }
  if (!moved) return;

  for (const [r, c, v] of mergedNotes) {
    placed[r][c] = makeNewTile(r, c, v, 'merged');
  }
  grid = placed;

  score += gained;
  addRandomTile();
  saveScore();
  saveState();
  render();

  if (!won && [...tiles.values()].some((t) => t.v >= 2048)) {
    won = true;
    status('🏆 2048 собрано! Дальше можно вести счёт до победного');
    return;
  }
  if (!freeCells().length && !canMerge()) {
    status('Игра окончена. Очки: ' + score + '. Рекорд: ' + best);
  }
}

const DIRS = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
const KEY_DIR = { ArrowUp: 0, KeyW: 0, ArrowDown: 1, KeyS: 1, ArrowLeft: 2, KeyA: 2, ArrowRight: 3, KeyD: 3 };
window.addEventListener('keydown', (e) => {
  if (e.code in KEY_DIR) { e.preventDefault(); doMove(DIRS[KEY_DIR[e.code]]); }
});

onSwipe((dx, dy) => {
  doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS[3] : DIRS[2]) : (dy > 0 ? DIRS[1] : DIRS[0]));
});

newGameBtn.addEventListener('click', restart);
drawBg();
if (!loadState()) {
  restart();
} else {
  render();
  if (!freeCells().length && !canMerge()) {
    status('Игра окончена. Очки: ' + score + '. Рекорд: ' + best);
  } else {
    status('Партия восстановлена. Очки: ' + score + '. Рекорд: ' + best);
  }
}
