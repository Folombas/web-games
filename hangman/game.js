'use strict';

import { loadBest, saveBest, randomInt } from '../js/core.js';
import { WORDS } from './words-ru.js';

const wordEl = document.getElementById('word');
const statusEl = document.getElementById('status');
const keyboardEl = document.getElementById('keyboard');
const winsEl = document.getElementById('wins');
const livesEl = document.getElementById('lives');
const newBtn = document.getElementById('newGame');
const parts = Array.from(document.querySelectorAll('.hang-part'));

const ROWS = ['ЙЦУКЕНГШЩЗХЪ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮЁ'];
const MAX_WRONG = 6;

let word = '';
let used = new Set();
let wrong = 0;
let wins = loadBest('wg-hangman-wins');
let over = false;

winsEl.textContent = String(wins);

function status(t) { statusEl.textContent = t; }

function buildKeyboard() {
  keyboardEl.innerHTML = '';
  for (const row of ROWS) {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';
    for (const ch of row) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kb-key';
      b.textContent = ch;
      b.dataset.ch = ch;
      b.setAttribute('aria-label', 'Буква ' + ch);
      rowEl.appendChild(b);
    }
    keyboardEl.appendChild(rowEl);
  }
}

function renderWord() {
  wordEl.innerHTML = '';
  for (const ch of word) {
    const span = document.createElement('span');
    span.className = 'letter' + (used.has(ch) ? ' is-revealed' : '') + (over && !used.has(ch) ? ' is-missed' : '');
    span.textContent = used.has(ch) || over ? ch : '';
    span.dataset.ch = ch;
    wordEl.appendChild(span);
  }
}

function renderKeyboardState() {
  keyboardEl.querySelectorAll('.kb-key').forEach((b) => {
    const ch = b.dataset.ch;
    const hit = used.has(ch);
    b.disabled = hit || over;
    b.classList.toggle('is-hit', hit && word.includes(ch));
    b.classList.toggle('is-miss', hit && !word.includes(ch));
    b.setAttribute('aria-label', 'Буква ' + ch + (hit ? (word.includes(ch) ? ', угадана' : ', такой нет') : ''));
  });
}

function renderGallows() {
  parts.forEach((p, i) => { p.style.display = i < wrong ? 'block' : 'none'; });
}

function announce() {
  const opened = [...word].filter((ch) => used.has(ch)).length;
  if (over) return;
  status('Слово из ' + word.length + ' букв, открыто ' + opened + ', ошибок: ' + wrong + ' из ' + MAX_WRONG);
}

function tryLetter(ch) {
  if (over || used.has(ch)) return;
  used.add(ch);
  if (word.includes(ch)) {
    renderWord();
    renderKeyboardState();
    const done = [...word].every((c) => used.has(c));
    if (done) {
      over = true;
      wins++;
      saveBest('wg-hangman-wins', wins);
      winsEl.textContent = String(wins);
      status('🏆 Угадано! Слово: ' + word + '. Всего побед: ' + wins);
      renderWord();
      renderKeyboardState();
      return;
    }
    status('Есть такая буква: ' + ch);
  } else {
    wrong++;
    renderGallows();
    livesEl.textContent = String(MAX_WRONG - wrong);
    if (wrong >= MAX_WRONG) {
      over = true;
      status('Игра окончена. Слово было: ' + word);
      renderWord();
      renderKeyboardState();
      return;
    }
    status('Такой буквы нет: ' + ch + '. Осталось попыток: ' + (MAX_WRONG - wrong));
  }
  announce();
}

function start() {
  word = WORDS[randomInt(WORDS.length)];
  used = new Set();
  wrong = 0;
  over = false;
  livesEl.textContent = String(MAX_WRONG);
  renderWord();
  renderKeyboardState();
  renderGallows();
  status('Угадай слово из ' + word.length + ' букв');
}

keyboardEl.addEventListener('click', (e) => {
  const b = e.target.closest('.kb-key');
  if (b) tryLetter(b.dataset.ch);
});

window.addEventListener('keydown', (e) => {
  const ch = (e.key || '').toUpperCase();
  if (ch.length === 1 && ((ch >= 'А' && ch <= 'Я') || ch === 'Ё')) {
    e.preventDefault();
    tryLetter(ch);
  }
});

newBtn.addEventListener('click', start);

buildKeyboard();
start();
