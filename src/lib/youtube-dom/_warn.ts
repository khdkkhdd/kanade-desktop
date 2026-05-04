/**
 * Tracks which warning keys have already fired so the same degradation signal
 * doesn't flood the console. The library uses warnOnce when a primary DOM
 * strategy can't find what it expected — typically a sign that YouTube's
 * structure has changed and a selector needs updating.
 */
const warned = new Set<string>();

export function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[kanade/yt-dom] ${message}`);
}

/** Test-only — reset internal state between specs. */
export function _resetWarnedForTesting(): void {
  warned.clear();
}
