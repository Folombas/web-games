/* Memory: чистая логика игры (без DOM) — колода пар, перемешивание, перевороты, поиск пар. */

export function createDeck(values) {
  const deck = [];
  values.forEach((v, pair) => {
    deck.push({ v, pair, open: false, out: false });
    deck.push({ v, pair, open: false, out: false });
  });
  return deck;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame(values) {
  return { deck: shuffle(createDeck(values)), first: null, moves: 0, matched: 0, over: false };
}

export function pick(game, index) {
  const card = game.deck[index];
  if (game.over || !card || card.out) return { kind: 'noop' };
  if (game.first === null) {
    if (card.open) return { kind: 'noop' };
    card.open = true;
    game.first = index;
    return { kind: 'first' };
  }
  if (game.first === index) return { kind: 'noop' };
  const firstIdx = game.first;
  const other = game.deck[firstIdx];
  card.open = true;
  game.first = null;
  game.moves++;
  if (other.pair === card.pair) {
    other.out = true;
    card.out = true;
    game.matched++;
    if (game.matched === game.deck.length / 2) game.over = true;
    return { kind: 'match', indexes: [firstIdx, index], over: game.over };
  }
  return { kind: 'miss', indexes: [firstIdx, index] };
}

export function closePair(game, indexes) {
  for (const i of indexes) game.deck[i].open = false;
}
