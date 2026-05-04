import { YT_SELECTORS } from './selectors.js';

/**
 * Distinguishes a thumbnail anchor from a title-only anchor — both share the
 * same /watch?v= href on a card, and we only inject UI on the thumbnail one
 * (otherwise text-only labels get a button overlaid on top, which looks bad).
 *
 * The check is "does this anchor contain a thumbnail-shaped child?" — the
 * multi-selector chain in YT_SELECTORS.thumbnailIndicator is intentional
 * fallback across lockup variants.
 */
export function isThumbnailAnchor(a: HTMLAnchorElement): boolean {
  return a.querySelector(YT_SELECTORS.thumbnailIndicator) !== null;
}
