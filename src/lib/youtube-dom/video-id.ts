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
