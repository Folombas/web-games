import { allEdges, boxEdges, boxesOfEdge, completedBoxes, N, BOXES } from "./core.js";
import { chooseMove } from "./ai.js";

const STORAGE_KEY = "web-games.dots.v1";
const SVG_NS = "http://www.w3.org/2000/svg";

// Геометрия поля.
const S = 64;   // шаг сетки
const PAD = 30; // отступ
const SIZE = PAD * 2 + S * (N - 1);

const els = {
  board: document.getElementById("board"),
  boardWrap: document.querySelector(".board-wrap"),
  status: document.getElementById("status"),
  scoreP1: document.getElementById("scoreP1"),
  scoreP2: document.getElementById("scoreP2"),
  scoreFree: document.getElementById("scoreFree"),
  scoreP2Label: document.getElementById("scoreP2Label"),
  newRound: document.getElementById("newRound"),
  soundToggle: document.getElementById("soundToggle"),
  difficulty: document.getElementById("difficulty"),
  modeButtons: document.querySelectorAll("[data-mode]"),
};

const state = {
  taken: new Set(),
  boxOwner: new Map(),
  counts: { 1: 0, 2: 0 },
  current: 1,
  running: false,
  mode: "pvp",
  difficulty: "hard",
  sound: true,
};

// Звуки: тик при линии и перезвон при захвате клетки.
const sound = (() => {
  let ctx = null;
  function tone(freq, duration, type, delay) {
    if (!state.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx = ctx || new Ctx();
      const start = ctx.currentTime + (delay || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    } catch (e) {
      // Аудио недоступно - играем молча.
    }
  }
  return {
    line: () => tone(520, 0.1, "triangle"),
    capture: () => { tone(660, 0.12, "triangle"); tone(880, 0.2, "triangle", 0.12); },
    win: () => { tone(523, 0.15, "triangle"); tone(659, 0.15, "triangle", 0.14); tone(784, 0.3, "triangle", 0.28); },
    draw: () => tone(220, 0.3, "sine"),
  };
})();

// ---------- Хранение настроек ----------

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode: state.mode,
      difficulty: state.difficulty,
      sound: state.sound,
    }));
  } catch (e) {
    // localStorage недоступен - просто продолжаем без сохранения.
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.mode === "pvp" || data.mode === "ai") state.mode = data.mode;
    if (data.difficulty === "easy" || data.difficulty === "hard") state.difficulty = data.difficulty;
    if (typeof data.sound === "boolean") state.sound = data.sound;
  } catch (e) {
    // Битые данные - начинаем с нуля.
  }
}

// ---------- Построение поля ----------

function point(r, c) {
  return { x: PAD + c * S, y: PAD + r * S };
}

const edgeLines = new Map();  // ключ ребра -> элемент линии
const edgeHitEls = new Map(); // ключ ребра -> зона клика (для aria и фокуса)
const boxFills = new Map();   // ключ клетки -> элемент закраски

function make(elName, attrs) {
  const el = document.createElementNS(SVG_NS, elName);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function buildBoard() {
  els.board.setAttribute("viewBox", "0 0 " + SIZE + " " + SIZE);

  // Закраски клеток (нижний слой).
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N - 1; c++) {
      const rect = make("rect", {
        x: PAD + c * S + 5,
        y: PAD + r * S + 5,
        width: S - 10,
        height: S - 10,
        rx: 8,
        class: "box-fill",
      });
      els.board.appendChild(rect);
      boxFills.set("b-" + r + "-" + c, rect);
    }
  }

  // Линии (скрыты до проведения).
  for (const edge of allEdges()) {
    let line;
    if (edge.type === "h") {
      const a = point(edge.r, edge.c);
      const b = point(edge.r, edge.c + 1);
      line = make("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "edge-line" });
    } else {
      const a = point(edge.r, edge.c);
      const b = point(edge.r + 1, edge.c);
      line = make("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "edge-line" });
    }
    els.board.appendChild(line);
    edgeLines.set(edge.key, line);
  }

  // Точки (поверх линий, как в тетради).
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const p = point(r, c);
      els.board.appendChild(make("circle", { cx: p.x, cy: p.y, r: 5, class: "dot" }));
    }
  }

  // Прозрачные зоны клика поверх всего.
  for (const edge of allEdges()) {
    let hit;
    if (edge.type === "h") {
      const a = point(edge.r, edge.c);
      hit = make("rect", {
        x: a.x - 2,
        y: a.y - 11,
        width: S + 4,
        height: 22,
        class: "edge-hit",
      });
    } else {
      const a = point(edge.r, edge.c);
      hit = make("rect", {
        x: a.x - 11,
        y: a.y - 2,
        width: 22,
        height: S + 4,
        class: "edge-hit",
      });
    }
    hit.dataset.edge = edge.key;
    // Клавиатура: фокус + Enter/Space на ребре.
    hit.setAttribute("tabindex", "0");
    hit.setAttribute("role", "button");
    edgeHitEls.set(edge.key, hit);
    describeEdge(edge.key, false);
    hit.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tryHumanMove(edge.key); }
    });
    hit.addEventListener("focus", () => previewEdge(edge.key, true));
    hit.addEventListener("blur", () => previewEdge(edge.key, false));
    hit.addEventListener("click", () => tryHumanMove(edge.key));
    hit.addEventListener("mouseenter", () => previewEdge(edge.key, true));
    hit.addEventListener("mouseleave", () => previewEdge(edge.key, false));
    els.board.appendChild(hit);
  }
}

function edgeName(key) {
  const [type, r, c] = key.split("-");
  const n1 = Number(r) + 1, n2 = Number(c) + 1;
  return type === "h"
    ? "Горизонтальная линия: ряд " + n1 + ", между точками " + n2 + " и " + (n2 + 1)
    : "Вертикальная линия: столбец " + n2 + ", между точками " + n1 + " и " + (n1 + 1);
}
function describeEdge(key, taken) {
  const hit = edgeHitEls.get(key);
  if (!hit) return;
  hit.setAttribute("aria-label", edgeName(key) + (taken ? ", проведена" : ""));
  if (taken) hit.setAttribute("aria-disabled", "true");
}

function previewEdge(key, on) {
  const line = edgeLines.get(key);
  if (!line || state.taken.has(key) || !state.running) return;
  if (on) {
    line.classList.add("edge-preview");
    line.style.stroke = state.current === 1 ? "var(--p1)" : "var(--p2)";
  } else {
    line.classList.remove("edge-preview");
    line.style.stroke = "";
  }
}

// ---------- Отрисовка и логика ----------

function renderScores() {
  els.scoreP1.textContent = String(state.counts[1]);
  els.scoreP2.textContent = String(state.counts[2]);
  els.scoreFree.textContent = String(BOXES - state.boxOwner.size);
}

function updateStatus(captured) {
  if (!state.running) return;
  const who = state.mode === "ai"
    ? (state.current === 1 ? "Твой ход (Игрок 1)" : "ИИ обдумывает ход…")
    : "Ход: Игрок " + state.current;
  els.status.textContent = (captured ? "Захвачено клеток: " + captured + "! Ходи ещё раз. " : "") + who;
}

function tryHumanMove(key) {
  if (!state.running || state.taken.has(key)) return;
  if (state.mode === "ai" && state.current === 2) return;
  claim(key);
}

function claim(key) {
  state.taken.add(key);
  describeEdge(key, true);
  const line = edgeLines.get(key);
  line.classList.remove("edge-preview");
  line.style.stroke = "";
  line.classList.add("edge--p" + state.current);
  sound.line();

  const done = completedBoxes(key, state.taken);
  let captured = 0;
  for (const [r, c] of done) {
    const boxKey = "b-" + r + "-" + c;
    if (state.boxOwner.has(boxKey)) continue;
    state.boxOwner.set(boxKey, state.current);
    state.counts[state.current] += 1;
    const fill = boxFills.get(boxKey);
    fill.classList.add("box--p" + state.current, "box-anim");
    captured += 1;
  }

  renderScores();

  if (state.boxOwner.size === BOXES) {
    finishRound();
    return;
  }

  if (captured) {
    // Клетка захвачена - игрок ходит ещё раз.
    sound.capture();
  } else {
    state.current = state.current === 1 ? 2 : 1;
  }
  updateStatus(captured);

  if (state.mode === "ai" && state.current === 2 && state.running) scheduleAi();
}

function scheduleAi() {
  els.boardWrap.classList.add("is-thinking");
  setTimeout(() => {
    els.boardWrap.classList.remove("is-thinking");
    if (!state.running) return;
    const move = chooseMove(state.taken, state.difficulty);
    if (move) claim(move);
  }, 480);
}

function finishRound() {
  state.running = false;
  els.boardWrap.classList.remove("is-thinking");
  els.boardWrap.classList.add("is-over");
  const { 1: p1, 2: p2 } = state.counts;
  if (p1 > p2) {
    els.status.textContent = "Победа: Игрок 1 (" + p1 + ":" + p2 + ")! 🎉";
    sound.win();
  } else if (p2 > p1) {
    els.status.textContent = state.mode === "ai"
      ? "Победил ИИ (" + p2 + ":" + p1 + "). Реванш?"
      : "Победа: Игрок 2 (" + p2 + ":" + p1 + ")! 🎉";
    sound.win();
  } else {
    els.status.textContent = "Ничья " + p1 + ":" + p2 + ". Сыграем ещё?";
    sound.draw();
  }
}

function newRound() {
  state.taken = new Set();
  state.boxOwner = new Map();
  state.counts = { 1: 0, 2: 0 };
  state.current = 1;
  state.running = true;
  els.boardWrap.classList.remove("is-over", "is-thinking");
  for (const line of edgeLines.values()) line.setAttribute("class", "edge-line");
  for (const fill of boxFills.values()) fill.setAttribute("class", "box-fill");
  for (const key of edgeHitEls.keys()) describeEdge(key, false);
  renderScores();
  updateStatus();
}

// ---------- Настройки ----------

function reflectSettings() {
  for (const btn of els.modeButtons) {
    btn.classList.toggle("is-active", btn.dataset.mode === state.mode);
  }
  els.difficulty.value = state.difficulty;
  els.scoreP2Label.textContent = state.mode === "ai" ? "ИИ" : "Игрок 2";
  updateSoundButton();
}

function updateSoundButton() {
  els.soundToggle.textContent = state.sound ? "🔊 Звук" : "🔇 Без звука";
  els.soundToggle.setAttribute("aria-pressed", String(state.sound));
}

els.newRound.addEventListener("click", () => newRound());

els.soundToggle.addEventListener("click", () => {
  state.sound = !state.sound;
  updateSoundButton();
  saveSettings();
});

for (const btn of els.modeButtons) {
  btn.addEventListener("click", () => {
    if (state.mode === btn.dataset.mode) return;
    state.mode = btn.dataset.mode;
    reflectSettings();
    newRound();
    saveSettings();
  });
}

els.difficulty.addEventListener("change", () => {
  state.difficulty = els.difficulty.value;
  newRound();
  saveSettings();
});

// ---------- Старт ----------

buildBoard();
loadSettings();
reflectSettings();
newRound();