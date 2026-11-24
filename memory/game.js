'use strict';

import { createGame, pick, closePair } from './core.js';
import { loadNumber, saveBest } from '../js/core.js';

const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
const timeEl = document.getElementById('time');
const movesEl = document.getElementById('moves');
const bestEl = document.getElementById('best');

const VALUES = ['🍇', '🍒', '🍋', '🥑', '🍉', '🌽', '🍄', '🚀'];
const BEST_KEY = 'wg-memory-best';

let game = null;
let startAt = 0;
let timerId = null;
let lockUntil = 0;
let elapsed = 0;

function status(t) { statusEl.textContent = t; }

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? m + ' мин ' + sec + ' с' : sec + ' с';
}

function showBest() {
  const v = loadNumber(BEST_KEY, Infinity);
  bestEl.textContent = Number.isFinite(v) ? fmt(v) : '—';
}

function render() {
  for (let i = 0; i < game.deck.length; i++) {
    const el = gridEl.children[i];
    const card = game.deck[i];
    el.classList.toggle('is-open', card.open || card.out);
    el.classList.toggle('is-out', card.out);
    if (card.open || card.out) {
      el.textContent = card.v;
      el.setAttribute('aria-label', 'Карта ' + (i + 1) + ': ' + card.v + (card.out ? ', пара найдена' : ''));
    } else {
      el.textContent = '';
      el.setAttribute('aria-label', 'Карта ' + (i + 1) + ': закрыта');
    }
  }
  movesEl.textContent = String(game.moves);
}

function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}

function tickTimer() {
  elapsed = Math.floor((Date.now() - startAt) / 1000);
  timeEl.textContent = String(elapsed);
}

function flipBack(els) {
  setTimeout(() => {
    closePair(game, els);
    render();
  }, 700);
}

function onCard(i) {
  if (!game || Date.now() < lockUntil) return;
  const res = pick(game, i);
  if (res.kind === 'noop') return;
  if (res.kind === 'first' && game.moves === 0 && !timerId) {
    startAt = Date.now();
    elapsed = 0;
    timerId = setInterval(tickTimer, 500);
  }
  if (res.kind === 'miss') {
    lockUntil = Date.now() + 720;
    flipBack(res.indexes);
    status('Не пара, попробуй ещё');
  } else if (res.kind === 'match') {
    status(res.over ? '' : 'Пара! Совпадений: ' + game.matched + ' из ' + VALUES.length);
  }
  if (game.over) {
    stopTimer();
    tickTimer();
    const prev = loadNumber(BEST_KEY, Infinity);
    if (elapsed < prev) {
      saveBest(BEST_KEY, elapsed);
      status('🏆 Все пары найдены за ' + fmt(elapsed) + ' (' + game.moves + ' ходов). Новый рекорд!');
    } else {
      status('🏆 Все пары найдены за ' + fmt(elapsed) + ' (' + game.moves + ' ходов). Рекорд: ' + fmt(prev));
    }
    showBest();
  }
  render();
}

function start() {
  game = createGame(VALUES);
  stopTimer();
  elapsed = 0;
  startAt = Date.now();
  timeEl.textContent = '0';
  lockUntil = 0;
  status('Открой любую карту');
  showBest();
  render();
}

gridEl.addEventListener('click', (e) => {
  const el = e.target.closest('.cell');
  if (el) onCard(Number(el.dataset.i));
});

document.getElementById('newGame').addEventListener('click', start);

for (let i = 0; i < 16; i++) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'cell';
  el.dataset.i = String(i);
  el.setAttribute('aria-label', 'Карта ' + (i + 1) + ': закрыта');
  gridEl.appendChild(el);
}
start();
