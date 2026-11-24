/* Общие игровые утилиты: рандом, числа/рекорды в localStorage, свайпы. */

export function randomInt(n) {
  return Math.floor(Math.random() * n);
}

export function loadNumber(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null || raw === '') return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

export function loadBest(key) {
  return loadNumber(key, 0);
}

export function saveBest(key, value) {
  localStorage.setItem(key, String(value));
}

/* Свайпы на window: вызывает handler(dx, dy) при жесте длиннее 24px. */
export function onSwipe(handler) {
  let start = null;
  window.addEventListener('touchstart', (e) => {
    start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!start) return;
    const dx = e.touches[0].clientX - start.x;
    const dy = e.touches[0].clientY - start.y;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    handler(dx, dy);
    start = null;
  }, { passive: true });
}
