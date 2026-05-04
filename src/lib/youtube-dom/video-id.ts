import { YT_REGEX } from './patterns.js';

/**
 * Extracts the 11-char video id from a YouTube URL, accepting both
 * /watch?v= and /shorts/ forms. Returns null when the href doesn't
 * point at a video (channel pages, non-YouTube URLs, empty input).
 */
export function extractVideoIdFromHref(href: string): string | null {
  const m = href.match(YT_REGEX.videoIdInUrl);
  return m ? m[1] : null;
}

/**
 * Returns the videoId of the watch page currently in the URL bar.
 * Used when a feature needs to know "is the page hosting video X playing X?"
 * — e.g., reading <video>.duration only when relevant.
 *
 * Returns null on non-watch pages (homepage, shorts, channel, etc.).
 * Note: this does NOT fall back to #movie_player.getVideoData() because that
 * polymer method is unreliable across SPA navigation (project learning PR4).
 */
export function getCurrentVideoId(loc: Location = window.location): string | null {
  const m = loc.href.match(YT_REGEX.videoIdInWatchQuery);
  return m ? m[1] : null;
}
