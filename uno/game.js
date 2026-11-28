/* Uno: UI. Движок — core.js, общие утилиты — ../js/core.js. */
import { COLOR_NAMES, cardName, imgName, newGame, canPlay, applyMove, drawCards, passTurn, aiChooseMove, topCard } from './core.js';
import { loadNumber, saveBest } from '../js/core.js';

const $ = (id) => document.getElementById(id);
const el = {
  aiHand: $('aiHand'), aiCount: $('aiCount'), aiUno: $('aiUno'), meUno: $('meUno'),
  deckBtn: $('deckBtn'), deckCount: $('deckCount'), discardImg: $('discardImg'),
  colorChip: $('colorChip'), status: $('status'), drawBtn: $('drawBtn'), passBtn: $('passBtn'),
  hand: $('hand'), wins: $('wins'), losses: $('losses'), colorModal: $('colorModal'),
  resultModal: $('resultModal'), resultTitle: $('resultTitle'), resultText: $('resultText'),
  aiSide: $('aiSide'), meSide: $('meSide')
};
let S = newGame();
let busy = false;
let pendingWild = null;
const stats = { w: loadNumber('uno.wins', 0), l: loadNumber('uno.losses', 0) };
const ORDER = { R: 0, B: 1, G: 2, Y: 3 };
const VORDER = { S: 10, R: 11, A2: 12, W: 13, W4: 14 };

function sortHand(hand) {
  return hand.slice().sort((a, b) => {
    const ca = a.color ? ORDER[a.color] : 9, cb = b.color ? ORDER[b.color] : 9;
    if (ca !== cb) return ca - cb;
    const va = VORDER[a.value] !== undefined ? VORDER[a.value] : Number(a.value);
    const vb = VORDER[b.value] !== undefined ? VORDER[b.value] : Number(b.value);
    return va - vb;
  });
}
function say(t) { el.status.textContent = t; }
function effectText(r, who) {
  if (r.event === 'skip') return ' — ' + who + ' пропускает ход';
  if (r.event === 'plus2') return ' — ' + who + ' берёт 2 и пропускает';
  if (r.event === 'plus4') return ' — ' + who + ' берёт 4 и пропускает';
  return '';
}
function render() {
  el.aiCount.textContent = S.hands[1].length;
  el.aiHand.innerHTML = '';
  const backs = Math.min(S.hands[1].length, 12);
  for (let i = 0; i < backs; i++) {
    const b = document.createElement('span');
    b.className = 'cardback'; b.textContent = 'UNO'; b.setAttribute('aria-hidden', 'true');
    el.aiHand.appendChild(b);
  }
  el.aiUno.hidden = S.hands[1].length !== 1;
  el.meUno.hidden = S.hands[0].length !== 1;
  const top = topCard(S);
  el.discardImg.src = 'assets/cards/' + imgName(top);
  el.discardImg.alt = 'На столе: ' + cardName(top);
  el.colorChip.textContent = COLOR_NAMES[S.color];
  el.colorChip.className = 'chip chip--' + S.color;
  el.deckCount.textContent = S.deck.length;
  el.hand.innerHTML = '';
  const myTurn = S.turn === 0 && S.winner === null && !busy;
  for (const c of sortHand(S.hands[0])) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ucard';
    const img = document.createElement('img');
    img.src = 'assets/cards/' + imgName(c);
    img.alt = cardName(c);
    btn.appendChild(img);
    btn.setAttribute('aria-label', cardName(c));
    let allowed = canPlay(c, S, S.hands[0]);
    if (S.drawn !== null) allowed = allowed && c.id === S.drawn;
    btn.disabled = !myTurn || !allowed;
    btn.addEventListener('click', () => humanPlay(c.id));
    el.hand.appendChild(btn);
  }
  el.drawBtn.disabled = !myTurn || S.drawn !== null;
  el.deckBtn.disabled = el.drawBtn.disabled;
  el.passBtn.hidden = !(S.turn === 0 && S.drawn !== null && S.winner === null && !busy);
  el.wins.textContent = stats.w;
  el.losses.textContent = stats.l;
  el.aiSide.classList.toggle('side--active', S.turn === 1 && S.winner === null);
  el.meSide.classList.toggle('side--active', S.turn === 0 && S.winner === null);
}
function finish() {
  if (S.winner === null) return false;
  busy = false;
  const won = S.winner === 0;
  if (won) sound.win(); else sound.lose();
  if (won) { stats.w++; saveBest('uno.wins', stats.w); } else { stats.l++; saveBest('uno.losses', stats.l); }
  el.resultTitle.textContent = won ? '🎉 Победа!' : '😔 Поражение';
  el.resultText.textContent = won ? 'Ты сбросил все карты первым. Красиво!' : 'ИИ оказался быстрее. Реванш?';
  el.resultModal.hidden = false;
  say(won ? 'Победа!' : 'Поражение.');
  render();
  return true;
}
function scheduleAi(prefix) {
  busy = true;
  render();
  say((prefix ? prefix + ' ' : '') + 'ИИ думает…');
  setTimeout(aiStep, 700 + Math.floor(Math.random() * 300));
}
function afterMove(msg) {
  sound.play();
  render();
  if (finish()) return;
  if (S.turn === 1) scheduleAi(msg);
  else { say(msg + ' Ходи ещё!'); render(); }
}
function humanPlay(cardId) {
  if (S.turn !== 0 || busy || S.winner !== null) return;
  const card = S.hands[0].find((c) => c.id === cardId);
  if (!card || !canPlay(card, S, S.hands[0])) return;
  if (S.drawn !== null && card.id !== S.drawn) return;
  if (!card.color) { pendingWild = cardId; el.colorModal.hidden = false; return; }
  const r = applyMove(S, 0, cardId, null);
  afterMove('Ты сыграл: ' + cardName(r.card) + effectText(r, 'ИИ') + '.');
}
function humanDraw() {
  if (S.turn !== 0 || busy || S.drawn !== null || S.winner !== null) return;
  const got = drawCards(S, 0, 1);
  sound.draw();
  if (got.length === 0) { say('Колода пуста.'); doPass(); return; }
  S.drawn = got[0].id;
  if (canPlay(got[0], S, S.hands[0])) {
    say('Взял: ' + cardName(got[0]) + '. Сыграй её или пасуй.');
    render();
  } else {
    say('Взял: ' + cardName(got[0]) + ' — не подходит.');
    render();
    setTimeout(() => { if (S.turn === 0 && S.drawn !== null && S.winner === null) doPass(); }, 900);
  }
}
function doPass() {
  if (S.turn !== 0 || S.winner !== null) return;
  passTurn(S);
  render();
  scheduleAi('Ты пасуешь.');
}
function playAiMove(m) {
  sound.play();
  const r = applyMove(S, 1, m.cardId, m.color);
  let msg = 'ИИ сыграл: ' + cardName(r.card);
  if (!r.card.color) msg += ', цвет — ' + COLOR_NAMES[r.color].toLowerCase();
  msg += effectText(r, 'ты') + '.';
  render();
  if (finish()) return;
  if (S.turn === 1) { say(msg); setTimeout(aiStep, 800); }
  else { busy = false; say(msg + ' Твой ход.'); render(); }
}
function aiStep() {
  if (S.turn !== 1 || S.winner !== null) { busy = false; render(); return; }
  const move = aiChooseMove(S);
  if (move) { playAiMove(move); return; }
  const got = drawCards(S, 1, 1);
  sound.draw();
  say('ИИ берёт карту…');
  render();
  setTimeout(() => {
    if (S.turn !== 1 || S.winner !== null) { busy = false; render(); return; }
    const m2 = got.length ? aiChooseMove(S) : null;
    if (m2) playAiMove(m2);
    else { passTurn(S); busy = false; say('ИИ пасует. Твой ход.'); render(); }
  }, 600);
}
function restart() {
  S = newGame(); busy = false; pendingWild = null;
  el.resultModal.hidden = true; el.colorModal.hidden = true;
  say('Новая партия. Твой ход!');
  render();
}
el.colorModal.querySelectorAll('.color').forEach((btn) => {
  btn.addEventListener('click', () => {
    const color = btn.dataset.color;
    el.colorModal.hidden = true;
    if (pendingWild === null) return;
    const id = pendingWild; pendingWild = null;
    const r = applyMove(S, 0, id, color);
    afterMove('Ты сыграл: ' + cardName(r.card) + ', цвет — ' + COLOR_NAMES[color].toLowerCase() + effectText(r, 'ИИ') + '.');
  });
});
$('newGame').addEventListener('click', restart);
$('againBtn').addEventListener('click', restart);
el.drawBtn.addEventListener('click', humanDraw);
el.deckBtn.addEventListener('click', humanDraw);
el.passBtn.addEventListener('click', doPass);
say('Твой ход!');
render();

// Горячие клавиши: D — взять, P — пас, N — новая партия (работают и в русской раскладке).
document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'n' || k === 'т') { restart(); return; }
  if (!el.colorModal.hidden || !el.resultModal.hidden) return;
  if (k === 'd' || k === 'в') humanDraw();
  else if ((k === 'p' || k === 'з') && !el.passBtn.hidden) doPass();
});

// Звуки через Web Audio API + кнопка mute (настройка сохраняется).
const sound = (() => {
  let ctx = null;
  let on = loadNumber('uno.sound', 1) === 1;
  function tone(freq, dur, type, delay) {
    if (!on) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx = ctx || new Ctx();
      const t = ctx.currentTime + (delay || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + dur);
    } catch (e) { /* аудио недоступно — играем молча */ }
  }
  return {
    play: () => tone(520, 0.09),
    draw: () => tone(300, 0.1, 'sine'),
    win: () => { tone(523, 0.15); tone(659, 0.15, 'triangle', 0.14); tone(784, 0.3, 'triangle', 0.28); },
    lose: () => tone(220, 0.35, 'sine'),
    toggle: () => { on = !on; saveBest('uno.sound', on ? 1 : 0); return on; },
    isOn: () => on,
  };
})();
const soundBtn = document.createElement('button');
soundBtn.type = 'button';
soundBtn.className = 'btn';
function reflectSound() {
  soundBtn.textContent = sound.isOn() ? '🔊 Звук' : '🔇 Без звука';
  soundBtn.setAttribute('aria-pressed', String(sound.isOn()));
}
soundBtn.addEventListener('click', () => { sound.toggle(); reflectSound(); });
reflectSound();
document.querySelector('.actions').appendChild(soundBtn);
