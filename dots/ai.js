// ИИ для "Точек". Ход ищется всегда для Игрока 2 (ИИ).
// "easy" - случайные ходы, "hard" - жадный эвристик:
// 1) добирает любую готовую клетку,
// 2) играет безопасно (не создаёт третьи стороны и не дарит клетки),
// 3) если дарить неизбежно - дарит как можно меньше.

import { allEdges, completedBoxes, boxesWith3Edges } from "./core.js";

export function chooseMove(taken, difficulty) {
  const moves = allEdges().map((e) => e.key).filter((k) => !taken.has(k));
  if (!moves.length) return null;

  if (difficulty === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const withEdge = (m) => {
    const s = new Set(taken);
    s.add(m);
    return s;
  };

  // 1. Захват: замыкаем клетку, это всегда хорошо.
  for (const m of moves) {
    if (completedBoxes(m, taken).length) return m;
  }

  // 2. Безопасный ход: после него нет ни одной клетки с тремя сторонами.
  const safe = moves.filter((m) => boxesWith3Edges(withEdge(m)).length === 0);
  if (safe.length) {
    return safe[Math.floor(Math.random() * safe.length)];
  }

  // 3. Приходится отдавать ход: минимизируем число клеток, которые
  //    соперник сможет тут же забрать.
  let best = null;
  let bestCost = Infinity;
  for (const m of moves) {
    const s = withEdge(m);
    let cost = 0;
    for (const k of moves) {
      if (k === m) continue;
      if (completedBoxes(k, s).length) cost += 1;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = m;
    }
  }
  return best;
}