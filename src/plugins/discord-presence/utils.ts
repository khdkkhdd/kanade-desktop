import { HANGUL_FILLER, MAX_ACTIVITY_TEXT_LENGTH, SEEK_THRESHOLD_SECONDS } from './constants.js';

/**
 * Satisfies Discord activity text requirements (trim / truncate / min-length pad).
 */
export function sanitizeActivityText(
  input: string | undefined,
  fallback = 'undefined',
): string {
  const text = input && input.trim() ? input.trim() : fallback.trim();
  let safe = truncate(text, MAX_ACTIVITY_TEXT_LENGTH);
  if (safe.length === 0) return fallback;
  if (safe.length < 2) safe = padHangul(safe);
  return safe;
}

/**
 * Pads with a Hangul filler char to satisfy Discord's 2-character minimum.
 */
export function padHangul(str: string): string {
  if (str.length === 0 || str.length >= 2) return str;
  return str + HANGUL_FILLER.repeat(2 - str.length);
}

function truncate(str: string, length: number): string {
  if (str.length > length) return `${str.substring(0, length - 3)}...`;
  return str;
}

export interface ArtistCreditLite {
  artistId: number;
  name: string;
  isPublic: boolean;
}

/**
 * Merges entries sharing the same artistId. Keeps the position of the first
 * occurrence; isPublic is OR'd across duplicates.
 */
export function dedupeByArtistId<T extends ArtistCreditLite>(credits: T[]): T[] {
  const byId = new Map<number, T>();
  const order: number[] = [];
  for (const c of credits) {
    const existing = byId.get(c.artistId);
    if (!existing) {
      byId.set(c.artistId, { ...c });
      order.push(c.artistId);
    } else {
      existing.isPublic = existing.isPublic || c.isPublic;
    }
  }
  return order.map((id) => byId.get(id)!);
}

export function isSeek(oldSeconds: number, newSeconds: number): boolean {
  return Math.abs(newSeconds - oldSeconds) > SEEK_THRESHOLD_SECONDS;
}
