/* Sudoku: чистые генератор и валидатор (без DOM). Решения единственны: каждая удалённая
   * клетка проверяется счётчиком решений. Уровни: easy/medium/hard. */

export const LEVELS = {
  easy: { label: 'Легко', holes: 40 },
  medium: { label: 'Средне', holes: 48 },
  hard: { label: 'Сложно', holes: 54 },
};

function shuffled(vals) {
  const a = vals.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ok(board, i, v) {
  const r = Math.floor(i / 9), c = i % 9;
  for (let k = 0; k < 9; k++) {
    if (board[r * 9 + k] === v) return false;
    if (board[k * 9 + c] === v) return false;
  }
  const r0 = Math.floor(r / 3) * 3, c0 = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
    if (board[(r0 + dr) * 9 + (c0 + dc)] === v) return false;
  }
  return true;
}

function fill(board) {
  for (let i = 0; i < 81; i++) {
    if (!board[i]) {
      for (const v of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        if (ok(board, i, v)) {
          board[i] = v;
          if (fill(board)) return true;
          board[i] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

export function candidatesOf(board, i) {
  const out = [];
  for (let v = 1; v <= 9; v++) if (ok(board, i, v)) out.push(v);
  return out;
}

/* Число решений с лимитом: рекурсивный solver с выбором клетки-минимума кандидатов. */
export function countSolutions(board, limit = 2) {
  const b = board.slice();
  let count = 0;
  function recurse() {
    if (count >= limit) return;
    let bestI = -1, bestVals = null;
    for (let i = 0; i < 81; i++) {
      if (b[i]) continue;
      const vals = candidatesOf(b, i);
      if (!vals.length) return;
      if (!bestVals || vals.length < bestVals.length) {
        bestI = i; bestVals = vals;
        if (vals.length === 1) break;
      }
    }
    if (bestI < 0) { count++; return; }
    for (const v of bestVals) {
      b[bestI] = v;
      recurse();
      b[bestI] = 0;
      if (count >= limit) return;
    }
  }
  recurse();
  return count;
}

export function generate(level) {
  const board = Array(81).fill(0);
  fill(board);
  const solution = board.slice();
  const puzzle = board.slice();
  const target = LEVELS[level] ? LEVELS[level].holes : 48;
  const order = [];
  for (let i = 0; i < 81; i++) order.push(i);
  const holes = shuffled(order);
  let removed = 0;
  for (const i of holes) {
    if (removed >= target) break;
    const saved = puzzle[i];
    if (!saved) continue;
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) === 1) removed++;
    else puzzle[i] = saved;
  }
  return { puzzle, solution, removed };
}

export function conflicts(board) {
  const bad = new Set();
  const scan = (cells) => {
    const seen = new Map();
    for (const i of cells) {
      if (!board[i]) continue;
      if (seen.has(board[i])) { bad.add(i); bad.add(seen.get(board[i])); }
      else seen.set(board[i], i);
    }
  };
  for (let r = 0; r < 9; r++) scan(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) scan(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  for (let br = 0; br < 9; br += 3) for (let bc = 0; bc < 9; bc += 3) {
    const cells = [];
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) cells.push((br + dr) * 9 + (bc + dc));
    scan(cells);
  }
  return [...bad];
}

export function isComplete(board) {
  for (let i = 0; i < 81; i++) if (!board[i]) return false;
  return conflicts(board).length === 0;
}

export function matchesSolution(board, solution) {
  for (let i = 0; i < 81; i++) if (!board[i] || board[i] !== solution[i]) return false;
  return true;
}
