/**
 * Regex constants for parsing YouTube URLs and identifiers.
 * Centralized here so that future URL scheme changes touch one place.
 */
export const YT_REGEX = {
  /** Matches `/watch?v=ID` or `/shorts/ID` substring within a YouTube URL. */
  videoIdInUrl: /(?:youtube\.com\/(?:watch\?v=|shorts\/))([\w-]{11})/,
  /** Matches `?v=ID` or `&v=ID` query param — used on the current /watch page. */
  videoIdInWatchQuery: /[?&]v=([\w-]{11})/,
} as const;
