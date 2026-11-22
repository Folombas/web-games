// Минимакс-ИИ для крестиков-ноликов.
// Ход ИИ ищется для игрока "O", человек играет "X".

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// Возвращает "X", "O", "draw" (ничья) или null (игра продолжается).
function winnerOf(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  return board.every(Boolean) ? "draw" : null;
}

// Классический минимакс: +N быстрой победе, -N быстрому поражению.
function minimax(board, current, depth) {
  const result = winnerOf(board);
  if (result === "O") return { score: 10 - depth };
  if (result === "X") return { score: depth - 10 };
  if (result === "draw") return { score: 0 };

  let best = null;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = current;
    const { score } = minimax(board, current === "O" ? "X" : "O", depth + 1);
    board[i] = null;
    const better = current === "O"
      ? !best || score > best.score
      : !best || score < best.score;
    if (better) best = { move: i, score };
  }
  return best;
}

/**
 * Возвращает индекс клетки для хода (0-8) или null, если ходов нет.
 * difficulty "easy" - случайный ход, "hard" - непобедимый минимакс.
 */
export function bestMove(board, player, difficulty = "hard") {
  const empty = [];
  for (let i = 0; i < 9; i++) if (!board[i]) empty.push(i);
  if (!empty.length) return null;
  if (difficulty === "easy") {
    return empty[Math.floor(Math.random() * empty.length)];
  }
  const { move } = minimax(board.slice(), player, 0);
  return move;
}

/** Результат партии: { winner, line }, { winner: null } для ничьей или null. */
export function evaluate(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return board.every(Boolean) ? { winner: null, line: null } : null;
}