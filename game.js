import { bestMove, evaluate } from "./ai.js";

const STORAGE_KEY = "web-games.tictactoe.v1";
const MARKS = { X: "✕", O: "◯" };

const els = {
  board: document.getElementById("board"),
  status: document.getElementById("status"),
  scoreX: document.getElementById("scoreX"),
  scoreO: document.getElementById("scoreO"),
  scoreDraw: document.getElementById("scoreDraw"),
  scoreOLabel: document.getElementById("scoreOLabel"),
  newRound: document.getElementById("newRound"),
  resetScore: document.getElementById("resetScore"),
  soundToggle: document.getElementById("soundToggle"),
  difficulty: document.getElementById("difficulty"),
  modeButtons: document.querySelectorAll("[data-mode]"),
};

const state = {
  board: Array(9).fill(null),
  current: "X",
  starting: "X",
  running: false,
  mode: "pvp",
  difficulty: "hard",
  scores: { X: 0, O: 0, draw: 0 },
  sound: true,
};

// Короткие звуки через Web Audio API, без внешних файлов.
const sound = (() => {
  let ctx = null;
  function tone(freq, duration, type) {
    if (!state.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx = ctx || new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Аудио недоступно - играем молча.
    }
  }
  return {
    mark: () => tone(440, 0.12, "triangle"),
    win: () => { tone(523, 0.15, "triangle"); setTimeout(() => tone(659, 0.2, "triangle"), 140); setTimeout(() => tone(784, 0.3, "triangle"), 300); },
    draw: () => tone(220, 0.3, "sine"),
  };
})();

// ---------- Хранение счёта и настроек ----------

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      scores: state.scores,
      sound: state.sound,
      mode: state.mode,
      difficulty: state.difficulty,
    }));
  } catch (e) {
    // localStorage недоступен - просто продолжаем без сохранения.
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.scores) state.scores = { X: 0, O: 0, draw: 0, ...data.scores };
    if (typeof data.sound === "boolean") state.sound = data.sound;
    if (data.mode === "pvp" || data.mode === "ai") state.mode = data.mode;
    if (data.difficulty === "easy" || data.difficulty === "hard") state.difficulty = data.difficulty;
  } catch (e) {
    // Битые данные - начинаем с нуля.
  }
}

// ---------- Отрисовка ----------

const cells = [];

function buildBoard() {
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", "Клетка " + (i + 1));
    cell.addEventListener("click", () => tryHumanMove(i));
    els.board.appendChild(cell);
    cells.push(cell);
  }
}

function renderScores() {
  els.scoreX.textContent = String(state.scores.X);
  els.scoreO.textContent = String(state.scores.O);
  els.scoreDraw.textContent = String(state.scores.draw);
}

function updateStatus() {
  if (!state.running) return;
  if (state.mode === "ai") {
    els.status.textContent = state.current === "X" ? "Твой ход (X)" : "ИИ обдумывает ход…";
  } else {
    els.status.textContent = "Ход: Игрок " + state.current;
  }
}

// ---------- Логика партии ----------

function tryHumanMove(i) {
  if (!state.running || state.board[i]) return;
  if (state.mode === "ai" && state.current === "O") return;
  playMove(i);
}

function playMove(i) {
  state.board[i] = state.current;
  renderCell(i);
  sound.mark();

  const result = evaluate(state.board);
  if (result) {
    finishRound(result);
    return;
  }

  state.current = state.current === "X" ? "O" : "X";
  updateStatus();
  if (state.mode === "ai" && state.current === "O") scheduleAi();
}

function scheduleAi() {
  els.board.classList.add("is-thinking");
  setTimeout(() => {
    els.board.classList.remove("is-thinking");
    if (!state.running) return;
    const move = bestMove(state.board.slice(), "O", state.difficulty);
    if (move != null) playMove(move);
  }, 420);
}

function finishRound(result) {
  state.running = false;
  els.board.classList.remove("is-thinking");
  els.board.classList.add("is-over");
  if (result.winner) {
    state.scores[result.winner] += 1;
    for (const i of result.line) cells[i].classList.add("is-win");
    if (state.mode === "ai") {
      els.status.textContent = result.winner === "X" ? "Победа! Ты обыграл ИИ 🎉" : "Победил ИИ. Реванш?";
    } else {
      els.status.textContent = "Победа: Игрок " + result.winner + "! 🎉";
    }
    sound.win();
  } else {
    state.scores.draw += 1;
    els.status.textContent = "Ничья. Сыграем ещё?";
    sound.draw();
  }
  renderScores();
  saveState();
}

function newRound(rotateStarter) {
  if (rotateStarter) state.starting = state.starting === "X" ? "O" : "X";
  state.board = Array(9).fill(null);
  state.current = state.starting;
  state.running = true;
  els.board.classList.remove("is-over", "is-thinking");
  for (let i = 0; i < 9; i++) {
    cells[i].className = "cell";
    cells[i].innerHTML = "";
  }
  updateStatus();
  if (state.mode === "ai" && state.current === "O") {
    els.board.classList.add("is-thinking");
    scheduleAi();
  }
}

function renderCell(i) {
  const cell = cells[i];
  cell.classList.add("is-filled", "cell--" + state.board[i]);
  const mark = document.createElement("span");
  mark.textContent = MARKS[state.board[i]];
  cell.appendChild(mark);
}

// ---------- Настройки ----------

function reflectSettings() {
  for (const btn of els.modeButtons) {
    btn.classList.toggle("is-active", btn.dataset.mode === state.mode);
  }
  els.difficulty.value = state.difficulty;
  els.scoreOLabel.textContent = state.mode === "ai" ? "ИИ" : "Игрок O";
  updateSoundButton();
}

function updateSoundButton() {
  els.soundToggle.textContent = state.sound ? "🔊 Звук" : "🔇 Без звука";
  els.soundToggle.setAttribute("aria-pressed", String(state.sound));
}

els.newRound.addEventListener("click", () => newRound(true));

els.resetScore.addEventListener("click", () => {
  state.scores = { X: 0, O: 0, draw: 0 };
  renderScores();
  saveState();
});

for (const btn of els.modeButtons) {
  btn.addEventListener("click", () => {
    if (state.mode === btn.dataset.mode) return;
    state.mode = btn.dataset.mode;
    state.starting = "X";
    reflectSettings();
    newRound(false);
    saveState();
  });
}

els.difficulty.addEventListener("change", () => {
  state.difficulty = els.difficulty.value;
  newRound(false);
  saveState();
});

els.soundToggle.addEventListener("click", () => {
  state.sound = !state.sound;
  updateSoundButton();
  saveState();
});

// Управление с клавиатуры: цифры 1-9 слева направо, сверху вниз.
window.addEventListener("keydown", (e) => {
  const n = Number(e.key);
  if (n >= 1 && n <= 9) tryHumanMove(n - 1);
});

// ---------- Старт ----------

buildBoard();
loadState();
reflectSettings();
renderScores();
newRound(false);