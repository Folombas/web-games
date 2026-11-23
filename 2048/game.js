'use strict';

/* 2048: классические правила, стрелки/WASD + свайпы, счёт и рекорд в localStorage. */
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const newGameBtn = document.getElementById('newGame');

const SIZE = 4;
const KEY = (text) => 'wg-2048-' + text;

const tiles = new Map(); // id -> {v, r, c, el}
let grid = [];           // grid[r][c] = id | null
let score = Number(localStorage.getItem(KEY('score'))) || 0;
let best = Number(localStorage.getItem(KEY('best'))) || 0;
let won = false, overloaded = false, idSeq = 0, uid = 0;

const COLORS = {
  2: '#3b4468', 4: '#465380', 8: '#7c9cff', 16: '#5e7dff', 32: '#4dd4ac', 64: '#2fb894',
  128: '#b296ff', 256: '#9a72ff', 512: '#8655ff', 1024: '#ff96a6', 2048: '#ff6b81',
};

function status(t) { statusEl.textContent = t; }
function saveScore() {
  localStorage.setItem(KEY('score'), String(score));
  if (score > best) { best = score; }
  localStorage.setItem(KEY('best'), String(best));
}

function posOf(r, c) { return 'translate(' + (c * 26 + 2.5) + '%, ' + (r * 26 + 2.5) + '%)'; }

function drawBg() {
  boardEl.querySelectorAll('.cell-bg').forEach((x) => x.remove());
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const bg = document.createElement('div');
    bg.className = 'cell-bg';
    bg.style.transform = posOf(r, c);
    boardEl.appendChild(bg);
  }
}

function render() {
  for (const [id, t] of tiles) {
    if (t.dead) { t.el.remove(); tiles.delete(id); continue; }
    t.el.style.transform = posOf(t.r, t.c);
    t.el.style.background = COLORS[t.v] || '#ff6b81';
    t.el.style.color = t.v >= 32 ? '#0b0e1a' : '#eef1ff';
    t.el.textContent = t.v;
  }
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
}

function addTile(r, c, v, isNew) {
  const el = document.createElement('div');
  el.className = 'tile' + (isNew ? ' new' : '');
  el.style.transform = posOf(r, c);
  boardEl.appendChild(el);
  const id = ++idSeq;
  tiles.set(id, { v, r, c, el });
  grid[r][c] = id;
}

function freeCells() {
  const free = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) free.push([r, c]);
  return free;
}

function restart() {
  tiles.forEach((t) => t.el.remove());
  tiles.clear();
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  score = 0; won = false; overloaded = false;
  saveScore();
  addTile(...freeCells()[Math.floor(Math.random() * freeCells().length)], Math.random() < 0.9 ? 2 : 4, true);
  addTile(...freeCells()[Math.floor(Math.random() * freeCells().length)], Math.random() < 0.9 ? 2 : 4, true);
  status('Двигай плитки: стрелки, WASD или свайпы');
  render();
}

function lineCells(line) { // линия из id в порядке движения (от края)
  return line.filter(Boolean).map((id) => tiles.get(id));
}

function move(dir) { // dir: {dr, dc}
  const before = score;
  let moved = false;
  const mergedIds = new Set();

  const getLine = (i) => {
    const ids = [];
    for (let j = 0; j < SIZE; j++) {
      const r = dir.dc ? (dir.dc > 0 ? i : j === 0 ? i : j) : j,
            c = dir.dc ? (dir.dc > 0 ? SIZE - 1 - j : j) : (dir.dr > 0 ? SIZE - 1 - j : j);
      break;
    }
    return ids;
  };
  // Проще: собрать линии прямо
  for (let i = 0; i < SIZE; i++) {
    const line = [];
    for (let j = 0; j < SIZE; j++) {
      let r, c;
      if (dir.dr === -1) { r = j; c = i; }
      else if (dir.dr === 1) { r = SIZE - 1 - j; c = i; }
      else if (dir.dc === -1) { r = i; c = j; }
      else { r = i; c = SIZE - 1 - j; }
      line.push(grid[r][c]);
    }
    const cells = lineCells(line);
    const result = [];
    for (let k = 0; k < cells.length; k++) {
      if (k + 1 < cells.length && cells[k].v === cells[k + 1].v && !mergedIds.has(cells[k + 1].el) && !cells[k + 1].mergedThisMove) {
        // слияние
        cells[k + 1].mergedThisMove = true;
        const total = cells[k].v * 2;
        cells[k].dead = true;
        const keep = cells[k + 1];
        keep.dead = true;
        result.push({ v: total, from: [cells[k], keep] });
      } else {
        result.push({ v: cells[k].v, from: [cells[k]] });
      }
    }
  }
  return moved;
}

function doMove(dir) {
  let moved = false;
  const newTiles = []; // для анимации слияний

  const buildResult = (i) => {
    const line = [];
    for (let j = 0; j < SIZE; j++) {
      let r, c;
      if (dir.dr === -1) { r = j; c = i; }
      else if (dir.dr === 1) { r = SIZE - 1 - j; c = i; }
      else if (dir.dc === -1) { r = i; c = j; }
      else { r = i; c = SIZE - 1 - j; }
      line.push([r, c, grid[r][c]]);
    }
    return line;
  };

  for (let i = 0; i < SIZE; i++) {
    const line = buildResult(i);
    const vals = line.map((x) => x[2] ? tiles.get(x[2]) : null).filter(Boolean);
    const out = [];
    for (let k = 0; k < vals.length; k++) {
      if (k + 1 < vals.length && vals[k].v === vals[k + 1].v && !vals[k + 1].locked) {
        vals[k + 1].locked = true;
        const total = vals[k].v * 2;
        const srcA = vals[k], srcB = vals[k + 1];
        srcA.dead = true; srcB.dead = true;
        const dest = line[out.length];
        out.push({ v: total, a: srcA, b: srcB, r: dest[0], c: dest[1] });
      } else {
        out.push({ v: vals[k].v, a: vals[k], r: line[out.length][0], c: line[out.length][1] });
      }
    }
    // записываем линию заново
    for (let j = 0; j < SIZE; j++) grid[line[j][0]][line[j][1]] = null;
    out.forEach((o, idx) => {
      const [r, c] = [line[idx][0], line[idx][1]];
      o.r = r; o.c = c;
    });
  }
  // reveal: применяем
  for (let i = 0; i < SIZE; i++) {
    const line = buildResult(i);
    const vals = line.map((x) => x[2] ? tiles.get(x[2]) : null).filter(Boolean);
    const out = [];
    for (let k = 0; k < vals.length; k++) {
      const dest = line[out.length];
      if (k + 1 < vals.length && vals[k].v === vals[k + 1].v && !vals[k + 1].locked) {
        vals[k + 1].locked = true;
        const total = vals[k].v * 2;
        const a = vals[k], b = vals[k + 1];
        out.push({ total, a, b, r: dest[0], c: dest[1] });
      } else {
        out.push({ total: vals[k].v, a: vals[k], b: null, r: dest[0], c: dest[1] });
      }
    }
    for (const o of out) {
      if (o.b) {
        // сдвигаем обе плитки к dest, затем заменяем одной новой с большим значением
        o.a.dead = true; o.b.dead = true;
        o.a.r = o.r; o.a.c = o.c; o.b.r = o.r; o.b.c = o.c;
        newTiles.push(o);
      } else if (o.a.r !== o.r || o.a.c !== o.c) moved = true;
    }
  }

  if (!moved && newTiles.length === 0) return;

  // фиксируем сетку
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (const o of newTiles) {
    const id = ++idSeq;
    const el = document.createElement('div');
    el.className = 'tile merged';
    el.style.transform = posOf(o.r, o.c);
    boardEl.appendChild(el);
    tiles.set(id, { v: o.total, r: o.r, c: o.c, el });
  }
  // остаёмся: переразмечаем живые плитки (мортвые уходят в render())
  const remain = [...tiles.entries()].filter(([id, t]) => !t.dead);
  for (const [id, t] of remain) { /* позиции уже выставлены */ }
  render();

  score += newTiles.reduce((s, o) => s + o.total, 0) - 0;
  // Корректировка счёта: score = старые очки + сумма слитых значений
  localStorage.setItem(KEY('score'), String(score));
  if (score > best) { best = score; localStorage.setItem(KEY('best'), String(best)); }
  bestEl.textContent = String(best);

  const free = freeCells();
  if (free.length) {
    const [r, c] = free[Math.floor(Math.random() * free.length)];
    addTile(r, c, Math.random() < 0.9 ? 2 : 4, true);
    moved = true;
  }
  render();
  checkEnd();
}

function checkEnd() {
  if (tiles && [...tiles.values()].some((t) => t.v >= 2048) && !won) {
    won = true;
    status('🏆 2048 собрано! Веди дальше или начни заново');
    return;
  }
  const hasMoves = freeCells().length > 0 || canMerge();
  if (!hasMoves) {
    localStorage.removeItem(KEY('score'));
    status('Игра окончена. Очки: ' + score + '. Рекорд: ' + best);
  }
}

function canMerge() {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const t = grid[r][c];
    if (!t) continue;
    const v = tiles.get(t).v;
    if (c + 1 < SIZE && grid[r][c + 1] && tiles.get(grid[r][c + 1]).v === v) return true;
    if (r + 1 < SIZE && grid[r + 1][c] && tiles.get(grid[r + 1][c]).v === v) return true;
  }
  return false;
}

const KEY_DIRS = {
  ArrowUp: 0, KeyW: 0, ArrowDown: 1, KeyS: 1, ArrowLeft: 2, KeyA: 2, ArrowRight: 3, KeyD: 3,
};
const DIRS = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
window.addEventListener('keydown', (e) => {
  if (e.code in KEY_DIRS) { e.preventDefault(); doMove(DIRS[KEY_DIRS[e.code]]); }
});

let ts = null;
window.addEventListener('touchstart', (e) => { ts = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (!ts) return;
  const dx = e.touches[0].clientX - ts.x, dy = e.touches[0].clientY - ts.y;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS[3] : DIRS[2]) : (dy > 0 ? DIRS[1] : DIRS[0]));
  ts = null;
}, { passive: true });

newGameBtn.addEventListener('click', restart);
drawBg();
restart();
