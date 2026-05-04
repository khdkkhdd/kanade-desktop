/**
 * Reads the duration (in seconds, floored) of the currently-loaded HTML5
 * <video> element on the page. Returns 0 when no video element exists or its
 * duration isn't yet known — the panel UI hides duration in that case.
 *
 * This intentionally does NOT fall back to #movie_player.getDuration().
 * The polymer player has stale-data issues during SPA navigation
 * (project learning PR4 #2 — same trap that drove player-sync over to
 * the raw <video> element).
 */
export function getCurrentVideoDuration(doc: Document = document): number {
  const v = doc.querySelector<HTMLVideoElement>('video');
  if (!v) return 0;
  const d = v.duration;
  return Number.isFinite(d) && d > 0 ? Math.floor(d) : 0;
}
