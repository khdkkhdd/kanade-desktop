import { ADD_SONG_RATE_LIMIT_MS } from './constants.js';

export function canAddSong(
  myLastAddAt: number,
  now: number,
): { ok: true } | { ok: false; remainingMs: number } {
  if (myLastAddAt === 0) return { ok: true };
  const elapsed = now - myLastAddAt;
  if (elapsed >= ADD_SONG_RATE_LIMIT_MS) return { ok: true };
  return { ok: false, remainingMs: ADD_SONG_RATE_LIMIT_MS - elapsed };
}
