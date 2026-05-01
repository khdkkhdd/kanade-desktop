import type { PlayerState } from './types.js';

export function expectedHostPosition(state: PlayerState | null, now: number): number {
  if (!state) return 0;
  if (!state.isPlaying) return state.position;
  return state.position + (now - state.ts) / 1000;
}

export function computeDrift(
  hostMsg: { videoId: string; position: number; ts: number },
  myPosition: number,
  now: number,
): number {
  const hostNow = hostMsg.position + (now - hostMsg.ts) / 1000;
  return myPosition - hostNow;
}
