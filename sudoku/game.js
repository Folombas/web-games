'use strict';

import { generate, conflicts, isComplete, matchesSolution } from './core.js';

const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
const levelEl = document.getElementById('level');

let puzzle = null, solution = null, board = null, givens = null;
let sel = 40;

function status(t) { statusEl.textContent = t; }

function cellName(i) {
  const r = Math.floor(i / 9) + 1, c = (i % 9) + 1;
  return 'строка ' + r + ', столбец ' + c;
}

function buildDom() {
  gridEl.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.id = 'cell-' + i;
    if (i % 9 === 2 || i % 9 === 5) el.classList.add('br');
    if (Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5) el.classList.add('bb');
    gridEl.appendChild(el);
  }
}

function render() {
  const bad = new Set(conflicts(board));
  for (let i = 0; i < 81; i++) {
    const el = gridEl.children[i];
    const v = board[i];
    el.textContent = v ? String(v) : '';
    el.classList.toggle('given', givens.has(i));
    el.classList.toggle('conflict', bad.has(i));
    el.classList.toggle('sel', i === sel);
    el.classList.toggle('same', !!v && v === board[sel] && i !== sel);
    const base = cellName(i);
    const g = givens.has(i) ? ' дано' : '';
    el.setAttribute('aria-label', base + (v ? ', значение ' + v : ', пусто') + g
      + (bad.has(i) ? ', конфликт' : ''));
  }
  gridEl.setAttribute('aria-activedescendant', 'cell-' + sel);
}

function afterMove() {
  const bad = conflicts(board).length;
  if (isComplete(board)) {
    if (matchesSolution(board, solution)) status('🏆 Решение верно! Судоку собрано');
    else status('Сетка заполнена, но с решением не совпадает. Где-то ошибка');
  } else if (bad) {
    status('Конфликтов: ' + bad + '. Красные клетки подсвечены');
  }
}

function setValue(v) {
  if (givens.has(sel)) { status('Эту клетку менять нельзя, она дана'); return; }
  board[sel] = v;
  render();
  afterMove();
}

function moveSel(di, dj) {
  const r = Math.floor(sel / 9), c = sel % 9;
  sel = Math.max(0, Math.min(8, r + di)) * 9 + Math.max(0, Math.min(8, c + dj));
  render();
}

function newGame(level) {
  const res = generate(level);
  puzzle = res.puzzle;
  solution = res.solution;
  board = puzzle.slice();
  givens = new Set();
  puzzle.forEach((v, i) => { if (v) givens.add(i); });
  sel = puzzle.findIndex((v) => !v);
  if (sel < 0) sel = 0;
  render();
  status('Уровень «' + levelEl.options[levelEl.selectedIndex].text + '»: заполнено '
    + puzzle.filter((v) => v).length + ' из 81');
}

gridEl.addEventListener('click', (e) => {
  const el = e.target.closest('.cell');
  if (el) { sel = Number(el.id.slice(5)); render(); }
});

gridEl.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'ArrowUp': e.preventDefault(); moveSel(-1, 0); break;
    case 'ArrowDown': e.preventDefault(); moveSel(1, 0); break;
    case 'ArrowLeft': e.preventDefault(); moveSel(0, -1); break;
    case 'ArrowRight': e.preventDefault(); moveSel(0, 1); break;
    case 'Backspace': case 'Delete': e.preventDefault(); setValue(0); break;
    default:
      if (e.key >= '1' && e.key <= '9') { setValue(Number(e.key)); e.preventDefault(); }
  }
});

const numpad = document.getElementById('numpad');
for (let v = 1; v <= 9; v++) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'num';
  b.textContent = String(v);
  b.setAttribute('aria-label', 'Ввести цифру ' + v);
  numpad.appendChild(b);
}
const del = document.createElement('button');
del.type = 'button';
del.className = 'num num--del';
del.textContent = '⌫';
del.setAttribute('aria-label', 'Стереть значение');
numpad.appendChild(del);
numpad.addEventListener('click', (e) => {
  const b = e.target.closest('.num');
  if (!b) return;
  setValue(b.classList.contains('num--del') ? 0 : Number(b.textContent));
});

document.getElementById('newGame').addEventListener('click', () => newGame(levelEl.value));
levelEl.addEventListener('change', () => newGame(levelEl.value));

buildDom();
newGame(levelEl.value);

// Подсказка: открывает правильное значение выбранной клетки.
let hintsUsed = 0;
const hintBtn = document.createElement('button');
hintBtn.type = 'button';
hintBtn.className = 'num num--hint';
hintBtn.textContent = '💡 Подсказка';
hintBtn.setAttribute('aria-label', 'Подсказка: открыть значение выбранной клетки');
hintBtn.addEventListener('click', () => {
  if (givens.has(sel)) { status('Эта клетка уже дана — выбери пустую'); return; }
  if (board[sel] === solution[sel]) { status('Здесь уже верно'); return; }
  board[sel] = solution[sel];
  hintsUsed += 1;
  render();
  status('Подсказка использована (' + hintsUsed + '). ' + cellName(sel) + ' = ' + solution[sel]);
  afterMove();
});
numpad.appendChild(hintBtn);
