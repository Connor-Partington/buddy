export type BallMotion = { x: number; y: number; vx: number; vy: number };

/** Bottom-origin coordinates; bounded time steps prevent jumps after a hidden panel resumes. */
export function stepBall(ball: BallMotion, width: number, height: number, seconds: number): BallMotion {
  const dt = Math.max(0, Math.min(0.04, seconds));
  const right = Math.max(8, width - 8);
  const top = Math.max(8, height - 8);
  let vx = ball.vx;
  let vy = ball.vy - 420 * dt;
  let x = ball.x + vx * dt;
  let y = ball.y + vy * dt;
  if (x < 8 || x > right) {
    vx = (x < 8 ? Math.abs(vx) : -Math.abs(vx)) * 0.8;
    x = Math.max(8, Math.min(right, x));
  }
  if (y < 8) {
    y = 8;
    vy = Math.abs(vy) > 48 ? Math.abs(vy) * 0.62 : 0;
    vx *= Math.exp(-2.8 * dt);
    if (Math.abs(vx) < 5) vx = 0;
  } else if (y > top) {
    y = top;
    vy = -Math.abs(vy) * 0.7;
  }
  return { x, y, vx, vy };
}
