/* Pong: чистая физика и логика (без DOM): мяч, ракетки, ИИ, счёт до WIN_SCORE. */

export const W = 480;
export const H = 320;
export const PAD_H = 64;
export const PAD_W = 10;
export const BALL_R = 6;
export const WIN_SCORE = 7;
export const SERVE_SPEED = 4;
export const BOUNCE_GAIN = 1.06;
export const MAX_SPEED = 11;

export function createState() {
  return {
    ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, live: false },
    left: { y: H / 2 - PAD_H / 2, score: 0 },
    right: { y: H / 2 - PAD_H / 2, score: 0 },
    serving: 'left',
  };
}

export function serve(state) {
  const dir = state.serving === 'left' ? -1 : 1;
  const vy = (Math.random() - 0.5) * 4;
  state.ball = { x: W / 2, y: H / 2, vx: dir * SERVE_SPEED, vy, live: true };
}

export function movePaddle(p, dy) {
  p.y = Math.max(0, Math.min(H - PAD_H, p.y + dy));
}

export function aiMove(state, maxSpeed = 4) {
  const target = state.ball.live
    ? state.ball.y - PAD_H / 2 + (Math.random() - 0.5) * 24
    : H / 2 - PAD_H / 2;
  const delta = target - state.right.y;
  movePaddle(state.right, Math.max(-maxSpeed, Math.min(maxSpeed, delta)));
}

export function step(state) {
  if (!state.ball.live) return { scored: null, hit: false };
  const b = state.ball;
  b.x += b.vx;
  b.y += b.vy;
  if (b.y < BALL_R) { b.y = BALL_R; b.vy = -b.vy; }
  if (b.y > H - BALL_R) { b.y = H - BALL_R; b.vy = -b.vy; }

  let hit = false;

  // левая ракетка (игрок)
  if (b.vx < 0 && b.x - BALL_R <= PAD_W && b.x - BALL_R >= -8 &&
      b.y >= state.left.y - BALL_R && b.y <= state.left.y + PAD_H + BALL_R) {
    b.x = PAD_W + BALL_R;
    const speed = Math.min(MAX_SPEED, Math.abs(b.vx) * BOUNCE_GAIN + 0.4);
    const offset = (b.y - (state.left.y + PAD_H / 2)) / (PAD_H / 2);
    b.vx = speed;
    b.vy = offset * 4 + b.vy * 0.3;
    hit = true;
  }

  // правая ракетка (ИИ)
  if (b.vx > 0 && b.x + BALL_R >= W - PAD_W * 2 && b.x + BALL_R <= W + 8 &&
      b.y >= state.right.y - BALL_R && b.y <= state.right.y + PAD_H + BALL_R) {
    b.x = W - PAD_W * 2 - BALL_R;
    const speed = Math.min(MAX_SPEED, Math.abs(b.vx) * BOUNCE_GAIN + 0.4);
    const offset = (b.y - (state.right.y + PAD_H / 2)) / (PAD_H / 2);
    b.vx = -speed;
    b.vy = offset * 4 + b.vy * 0.3;
    hit = true;
  }

  if (b.x < -BALL_R * 2) {
    state.right.score++;
    state.serving = 'left';
    b.live = false;
    b.x = W / 2; b.y = H / 2; b.vx = 0; b.vy = 0;
    return { scored: 'right', hit };
  }
  if (b.x > W + BALL_R * 2) {
    state.left.score++;
    state.serving = 'right';
    b.live = false;
    b.x = W / 2; b.y = H / 2; b.vx = 0; b.vy = 0;
    return { scored: 'left', hit };
  }
  return { scored: null, hit };
}

export function winner(state) {
  if (state.left.score >= WIN_SCORE) return 'left';
  if (state.right.score >= WIN_SCORE) return 'right';
  return null;
}
