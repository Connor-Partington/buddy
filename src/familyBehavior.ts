export function chooseFamilyActivity(previous: string, roll: number, timing: number): { state: string; duration: number } {
  const states = ['idle', 'idle', 'lookLeft', 'lookRight', 'thinking', 'walk', 'happy', 'jump', 'sleeping'];
  let state = states[Math.min(states.length - 1, Math.max(0, Math.floor(roll * states.length)))];
  if (state === 'sleeping' && previous === 'sleeping') state = 'idle';
  const duration = state === 'sleeping' ? 18000 + timing * 24000
    : state === 'happy' || state === 'jump' ? 1200 + timing * 1400 : 4000 + timing * 8000;
  return { state, duration };
}

/** Bounded horizontal travel also eases a chase back to its resting slot. */
export function moveFamilyX(current: number, target: number, elapsedSeconds: number): number {
  const distance = Math.min(.05, Math.max(0, elapsedSeconds)) * 40;
  return current + Math.max(-distance, Math.min(distance, target - current));
}

/** Find the nearest floor position with an eight-pixel gap between sleeping footprints. */
export function findSleepSpot(x: number, size: number, panelWidth: number, sleepers: {x: number; width: number}[]): number | undefined {
  const left = size / 2, right = panelWidth - size / 2;
  if (right < left) return undefined;
  const candidates = [Math.max(left, Math.min(right, x)), left, right,
    ...sleepers.flatMap(other => [other.x - (size + other.width) / 2 - 8, other.x + (size + other.width) / 2 + 8])];
  return candidates.filter(candidate => candidate >= left && candidate <= right &&
    sleepers.every(other => Math.abs(candidate-other.x) >= (size+other.width)/2+8-.001))
    .sort((a,b) => Math.abs(a-x)-Math.abs(b-x))[0];
}
