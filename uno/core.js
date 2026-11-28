/* Uno: чистый движок и ИИ. Без DOM. */
export const COLORS = ['R', 'B', 'G', 'Y'];
export const COLOR_NAMES = { R: 'Красный', B: 'Синий', G: 'Зелёный', Y: 'Жёлтый' };
export const VALUE_NAMES = { S: 'пропуск', R: 'разворот', A2: '+2', W: 'дикая', W4: 'дикая +4' };

export function cardName(c) {
  if (!c.color) return VALUE_NAMES[c.value];
  return COLOR_NAMES[c.color] + ' · ' + (VALUE_NAMES[c.value] || c.value);
}
export function imgName(c) {
  if (c.value === 'W') return 'WC.png';
  if (c.value === 'W4') return 'W4.png';
  return c.color + c.value + '.png';
}
export function buildDeck() {
  const deck = []; let id = 0;
  for (const color of COLORS) {
    deck.push({ id: id++, color, value: '0' });
    for (let n = 1; n <= 9; n++) {
      deck.push({ id: id++, color, value: String(n) });
      deck.push({ id: id++, color, value: String(n) });
    }
    for (const v of ['S', 'R', 'A2']) {
      deck.push({ id: id++, color, value: v });
      deck.push({ id: id++, color, value: v });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: id++, color: null, value: 'W' });
    deck.push({ id: id++, color: null, value: 'W4' });
  }
  return deck;
}
export function shuffle(arr, rng) {
  const rnd = rng || Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
export function newGame(rng) {
  const rnd = rng || Math.random;
  const deck = shuffle(buildDeck(), rnd);
  const hands = [[], []];
  for (let i = 0; i < 7; i++) { hands[0].push(deck.pop()); hands[1].push(deck.pop()); }
  const buried = [];
  let first = deck.pop();
  while (!/^[0-9]$/.test(first.value)) { buried.push(first); first = deck.pop(); }
  for (const c of buried) deck.unshift(c);
  return { deck, discard: [first], hands, color: first.color, turn: 0, drawn: null, winner: null };
}
export function topCard(s) { return s.discard[s.discard.length - 1]; }
export function canPlay(card, s, hand) {
  if (card.value === 'W') return true;
  if (card.value === 'W4') return !hand.some((c) => c.color === s.color);
  return card.color === s.color || card.value === topCard(s).value;
}
export function legalMoves(s, player) {
  const hand = s.hands[player];
  return hand.filter((c) => canPlay(c, s, hand));
}
function refill(s, rng) {
  if (s.deck.length === 0 && s.discard.length > 1) {
    const top = s.discard.pop();
    s.deck = shuffle(s.discard, rng);
    s.discard = [top];
  }
}
export function drawCards(s, player, n, rng) {
  const got = [];
  for (let i = 0; i < n; i++) {
    refill(s, rng);
    if (s.deck.length === 0) break;
    const c = s.deck.pop();
    s.hands[player].push(c);
    got.push(c);
  }
  return got;
}
export function applyMove(s, player, cardId, chosenColor, rng) {
  const hand = s.hands[player];
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new Error('card not in hand');
  const card = hand[idx];
  if (!canPlay(card, s, hand)) throw new Error('illegal move');
  if (!card.color && COLORS.indexOf(chosenColor) === -1) throw new Error('color required');
  hand.splice(idx, 1);
  s.discard.push(card);
  s.color = card.color || chosenColor;
  s.drawn = null;
  const opp = 1 - player;
  let event = 'play';
  if (card.value === 'S' || card.value === 'R') { event = 'skip'; s.turn = player; }
  else if (card.value === 'A2') { drawCards(s, opp, 2, rng); event = 'plus2'; s.turn = player; }
  else if (card.value === 'W4') { drawCards(s, opp, 4, rng); event = 'plus4'; s.turn = player; }
  else { s.turn = opp; }
  if (hand.length === 0) s.winner = player;
  return { event, card, color: s.color };
}
export function passTurn(s) { s.turn = 1 - s.turn; s.drawn = null; }
export function aiChooseMove(s) {
  const moves = legalMoves(s, 1);
  if (moves.length === 0) return null;
  const danger = s.hands[0].length <= 2;
  const score = (c) => {
    if (c.value === 'W4') return danger ? 95 : 10;
    if (c.value === 'A2' || c.value === 'S' || c.value === 'R') return danger ? 90 : 40;
    if (c.value === 'W') return danger ? 30 : 5;
    return 60 + Number(c.value);
  };
  moves.sort((a, b) => score(b) - score(a));
  const best = moves[0];
  let color = null;
  if (!best.color) {
    const counts = { R: 0, B: 0, G: 0, Y: 0 };
    for (const c of s.hands[1]) if (c.color) counts[c.color]++;
    color = COLORS.reduce((a, b) => (counts[b] > counts[a] ? b : a), 'R');
  }
  return { cardId: best.id, color };
}
