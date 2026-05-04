import { YT_SELECTORS } from './selectors.js';
import { warnOnce } from './_warn.js';

/**
 * Distinguishes a thumbnail anchor from a title-only anchor — both share the
 * same /watch?v= href on a card, and callers typically want to act on the
 * thumbnail anchor only.
 *
 * The check is "does this anchor contain a thumbnail-shaped child?" — the
 * multi-selector chain in YT_SELECTORS.thumbnailIndicator is intentional
 * fallback across lockup variants.
 */
export function isThumbnailAnchor(a: HTMLAnchorElement): boolean {
  return a.querySelector(YT_SELECTORS.thumbnailIndicator) !== null;
}

/**
 * Tag names of YouTube's known per-card container elements. The hover-host
 * climb stops here. Adding a new card type means appending to this set —
 * that's the explicit YouTube-knowledge boundary the library centralizes.
 *
 * Heuristic-based stop rules (sibling counting, parent-is-custom, etc.) all
 * failed in practice because YouTube's DOM has stray `/watch?v=` anchors at
 * higher levels (page chrome, ghost templates) and Polymer slot div#contents
 * intermediates between custom-element ancestors. An explicit allowlist is
 * the only reliable boundary.
 */
const KNOWN_CARD_TAGS = new Set([
  'YTD-RICH-ITEM-RENDERER',          // homepage rich-grid
  'YT-LOCKUP-VIEW-MODEL',            // related sidebar, embedded lockups
  'YTD-VIDEO-RENDERER',              // search, channel
  'YTD-COMPACT-VIDEO-RENDERER',      // legacy sidebar
  'YTD-PLAYLIST-PANEL-VIDEO-RENDERER', // mix sidebar
  'YTM-SHORTS-LOCKUP-VIEW-MODEL',    // shorts in feed
  'YTM-SHORTS-LOCKUP-VIEW-MODEL-V2', // shorts (new)
]);

/**
 * Finds the per-card container element that should receive `.kanade-card-host`
 * for hover detection. Climbs from `parent` to the nearest ancestor whose
 * tagName is in `KNOWN_CARD_TAGS` and that has a real layout box (not
 * display:contents).
 *
 * Returns `[host]` (single-element array) on match, `[]` if no known card-tag
 * ancestor exists. Empty result means the anchor is not part of a recognized
 * card layout — typically a stray /watch?v= anchor in page chrome — and the
 * caller should skip injection.
 *
 * The plural return type leaves room for future use (e.g., marking inner +
 * outer hosts) without API churn, but currently always returns 0 or 1
 * elements.
 */
export function findCardHosts(parent: Element, win: Window = window): Element[] {
  let cur: Element | null = parent;
  while (cur && cur !== cur.ownerDocument.body) {
    if (KNOWN_CARD_TAGS.has(cur.tagName) &&
        win.getComputedStyle(cur).display !== 'contents') {
      return [cur];
    }
    cur = cur.parentElement;
  }
  warnOnce(
    'findCardHosts',
    'No known card-tag ancestor found for a video anchor — likely a stray /watch link, or YouTube added a new lockup type. Update KNOWN_CARD_TAGS in cards.ts.',
  );
  return [];
}
