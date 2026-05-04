/**
 * CSS selectors targeting YouTube DOM elements.
 * Multi-selector entries are intentional fallback chains — adding new variants
 * here is the typical fix when YouTube renames an element. The order should
 * go specific-first when ambiguity matters.
 */
export const YT_SELECTORS = {
  /** Any anchor pointing to a YouTube video (watch or shorts). */
  videoAnchor: 'a[href*="/watch?v="], a[href*="/shorts/"]',
  /**
   * Image-bearing children that distinguish a thumbnail anchor from a title
   * anchor (both share the same href). Multi-selector forms an implicit
   * fallback chain across lockup variants.
   */
  thumbnailIndicator: 'img, yt-image, yt-img-shadow, picture, ytd-thumbnail, yt-thumbnail-view-model',
} as const;
