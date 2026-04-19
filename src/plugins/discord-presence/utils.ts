import { HANGUL_FILLER, MAX_ACTIVITY_TEXT_LENGTH } from './constants.js';

/**
 * Discord 활동 텍스트 요구사항 충족 (trim / truncate / min-length pad).
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
 * Discord min-2자 조건을 만족하도록 한글 filler 로 pad.
 */
export function padHangul(str: string): string {
  if (str.length === 0 || str.length >= 2) return str;
  return str + HANGUL_FILLER.repeat(2 - str.length);
}

function truncate(str: string, length: number): string {
  if (str.length > length) return `${str.substring(0, length - 3)}...`;
  return str;
}
