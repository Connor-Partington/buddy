import type { BallMotion } from './ballPhysics';

export type BallPlay = {
  phase: 'watch' | 'stalk' | 'crouch' | 'pounce' | 'mouth' | 'recover';
  elapsed: number;
  round: number;
  startX: number;
  targetX: number;
  direction: number;
  pause: number;
};

/** Presentation-only play: never consumes food or awards care/XP. Time advances only with visible frames. */
export function stepBallPlay(play: BallPlay, ball: BallMotion, x: number, width: number, limit: number, seconds: number) {
  play = { ...play, elapsed: play.elapsed + Math.max(0, Math.min(seconds, 0.04)) };
  ball = { ...ball };
  const dt = Math.max(0, Math.min(seconds, 0.04));
  const bound = (value: number) => Math.max(-limit, Math.min(limit, value));
  const target = bound(ball.x - width / 2);
  const distance = target - x;
  let sprite = 'idle', lift = 0, hidden = false;
  const enter = (phase: BallPlay['phase']) => { play.phase = phase; play.elapsed = 0; };
  const launch = (loft: number, speed: number) => {
    const direction = ball.x < width * 0.2 ? 1 : ball.x > width * 0.8 ? -1 : play.direction;
    ball.vx = direction * speed;
    ball.vy = loft;
    enter('recover');
  };
  if (play.phase !== 'pounce' && play.phase !== 'mouth' && Math.abs(distance) > 2) play.direction = distance > 0 ? 1 : -1;
  switch (play.phase) {
    case 'watch': {
      sprite = play.direction > 0 ? 'lookRight' : 'lookLeft';
      const settled = ball.y <= 8.1 && Math.abs(ball.vx) < 5 && ball.vy === 0;
      // Every third bout waits for the toy to stop, with a bounded fallback after a resize or interruption.
      if (play.elapsed >= play.pause && (play.round % 3 !== 0 || settled || play.elapsed > 12)) enter('stalk');
      break;
    }
    case 'stalk':
      sprite = Math.abs(distance) > 5 ? 'walk' : 'idle';
      if (play.round % 3 === 0 && Math.abs(distance) > 55 && play.elapsed > 0.5) {
        play.startX = x;
        play.targetX = bound(ball.x + ball.vx * 0.6 - width / 2);
        enter('crouch');
      } else if (Math.abs(distance) <= 20 && ball.y < 35) {
        if (play.round % 3 === 1) enter('mouth');
        else if (play.round % 3 === 2) launch(160, 160);
        else { play.startX = x; play.targetX = target; enter('crouch'); }
      } else {
        x = bound(x + Math.sign(distance) * Math.min(Math.abs(distance), 95 * dt));
      }
      break;
    case 'crouch':
      sprite = 'thinking';
      if (play.elapsed >= 0.45) {
        play.startX = x;
        play.targetX = bound(ball.x + ball.vx * 0.6 - width / 2);
        enter('pounce');
      }
      break;
    case 'pounce': {
      sprite = 'jump';
      const progress = Math.min(1, play.elapsed / 0.6);
      x = bound(play.startX + (bound(play.targetX) - play.startX) * progress);
      lift = Math.sin(progress * Math.PI) * Math.min(68, 30 + Math.abs(play.targetX - play.startX) * 0.18);
      if (progress >= 1) {
        lift = 0;
        if (Math.abs(ball.x - (width / 2 + x)) < 40 && ball.y < 45) launch(270, 175);
        else enter('stalk');
      }
      break;
    }
    case 'mouth':
      sprite = 'eat';
      hidden = true;
      ball = { x: Math.max(8, Math.min(width - 8, width / 2 + x + play.direction * 12)), y: 22, vx: 0, vy: 0 };
      if (play.elapsed >= 0.95) {
        launch(play.round % 2 ? 340 : 235, play.round % 2 ? 100 : 185);
        hidden = false;
        sprite = 'happy';
      }
      break;
    case 'recover':
      sprite = 'happy';
      if (play.elapsed >= 0.9) { play.round++; enter('watch'); }
      break;
  }
  return { play, ball, x, lift, sprite, hidden, direction: play.direction };
}
