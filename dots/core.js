// Общая геометрия и правила поля для игры "Точки" (Dots and Boxes).
// Поле: N x N точек, между соседними точками можно проводить линии.

export const N = 5; // точек по каждой стороне
export const BOXES = (N - 1) * (N - 1); // всего клеток-квадратиков

// Все возможные линии (рёбра). Ключ: h-строка-колонка или v-строка-колонка.
export function allEdges() {
  const edges = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N - 1; c++) {
      edges.push({ key: "h-" + r + "-" + c, type: "h", r, c });
    }
  }
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N; c++) {
      edges.push({ key: "v-" + r + "-" + c, type: "v", r, c });
    }
  }
  return edges;
}

// Клетки, к которым примыкает ребро.
export function boxesOfEdge(edgeKey) {
  const parts = edgeKey.split("-");
  const type = parts[0];
  const r = Number(parts[1]);
  const c = Number(parts[2]);
  const out = [];
  if (type === "h") {
    if (r - 1 >= 0) out.push([r - 1, c]);
    if (r <= N - 2) out.push([r, c]);
  } else {
    if (c - 1 >= 0) out.push([r, c - 1]);
    if (c <= N - 2) out.push([r, c]);
  }
  return out;
}

// Четыре ребра клетки.
export function boxEdges(boxR, boxC) {
  return {
    top: "h-" + boxR + "-" + boxC,
    bottom: "h-" + (boxR + 1) + "-" + boxC,
    left: "v-" + boxR + "-" + boxC,
    right: "v-" + boxR + "-" + (boxC + 1),
  };
}

// Клетки, замкнутые ребром edgeKey при уже проведённых линиях taken (Set).
export function completedBoxes(edgeKey, taken) {
  return boxesOfEdge(edgeKey).filter(([r, c]) => {
    const e = boxEdges(r, c);
    return taken.has(e.top) && taken.has(e.bottom) && taken.has(e.left) && taken.has(e.right);
  });
}

// Клетки, у которых проведены ровно 3 стороны (один ход до захвата).
export function boxesWith3Edges(taken) {
  const out = [];
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N - 1; c++) {
      const e = boxEdges(r, c);
      const sides = [e.top, e.bottom, e.left, e.right];
      const drawn = sides.filter((k) => taken.has(k)).length;
      if (drawn === 3) out.push([r, c]);
    }
  }
  return out;
}