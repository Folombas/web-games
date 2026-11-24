'use strict';

import { createState, serve, step, aiMove, movePaddle, winner, W, H, PAD_H, PAD_W, BALL_R, WIN_SCORE } from './core.js';

const canvas = document.getElementById('court');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const scoreLeftEl = document.getElementById('scoreLeft');
const scoreRightEl = document.getElementById('scoreRight');
const overEl = document.getElementById('over');
const overTitleEl = document.getElementById('overTitle');

let state = createState();
let keys = { up: false, down: false };
let finished = false;
let rafId = null;

function status(t) { statusEl.textContent = t; }

function showScores() {
  scoreLeftEl.textContent = String(state.left.score);
  scoreRightEl.textContent = String(state.right.score);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(154,163,199,0.25)';
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#7c9cff';
  ctx.fillRect(PAD_W, state.left.y, PAD_W, PAD_H);
  ctx.fillStyle = '#ff6b81';
  ctx.fillRect(W - PAD_W * 2, state.right.y, PAD_W, PAD_H);
  ctx.fillStyle = '#eef1ff';
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
}

function loop() {
  if (finished) return;
  if (keys.up) movePaddle(state.left, -6);
  if (keys.down) movePaddle(state.left, 6);

  if (!state.ball.live) {
    serve(state);
  }
  aiMove(state, 4.2);
  const res = step(state);
  if (res.hit) status('');
  if (res.scored) {
    showScores();
    const w = winner(state);
    if (w) {
      finish(w);
      return;
    }
    status(state.serving === 'left' ? 'Ты пропустил. Подача твоя' : 'Очко! ИИ подаёт');
  }
  draw();
  rafId = requestAnimationFrame(loop);
}

function finish(who) {
  finished = true;
  if (rafId) cancelAnimationFrame(rafId);
  overTitleEl.textContent = who === 'left' ? '🏆 Партия твоя, ' + WIN_SCORE + ':'
    + state.right.score : '🤖 ИИ забрал партию ' + state.right.score + ':' + state.left.score;
  overEl.classList.remove('hidden');
  status(who === 'left' ? '🏆 Победа! Можно сыграть ещё' : 'ИИ победил. Попробуй ещё раз');
}

function pointerY(e) {
  const t = e.touches ? e.touches[0] : e;
  const rect = canvas.getBoundingClientRect();
  return ((t.clientY - rect.top) / rect.height) * H;
}

canvas.addEventListener('mousemove', (e) => {
  if (finished) return;
  state.left.y = Math.max(0, Math.min(H - PAD_H, pointerY(e) - PAD_H / 2));
});
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (finished) return;
  state.left.y = Math.max(0, Math.min(H - PAD_H, pointerY(e) - PAD_H / 2));
}, { passive: false });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') { keys.up = true; e.preventDefault(); }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') { keys.down = true; e.preventDefault(); }
  if (e.code === 'Space') { e.preventDefault(); if (finished) restart(); }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
});

function restart() {
  state = createState();
  finished = false;
  overEl.classList.add('hidden');
  showScores();
  status('Подача: мяч в игре');
  if (rafId) cancelAnimationFrame(rafId);
  loop();
}

document.getElementById('again').addEventListener('click', restart);
showScores();
loop();
