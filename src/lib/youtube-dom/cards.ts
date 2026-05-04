import { YT_SELECTORS } from './selectors.js';
import { warnOnce } from './_warn.js';

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

/**
 * Finds the nearest custom-element ancestor that has a real layout box —
 * the element our hover detector toggles `.kanade-card-host` on.
 *
 * Two ancestor types must be skipped:
 * - non-custom elements (plain divs etc.) — CSS class mark wouldn't survive
 *   YouTube's component re-renders
 * - custom elements with `display: contents` (e.g., the homepage's
 *   yt-lockup-view-model) — they have no box, so visual hover area would be
 *   wrong; climb past to a real-box ancestor like ytd-rich-item-renderer
 *
 * Returns null when no suitable ancestor exists; emits a warnOnce signal so a
 * silent layout regression is at least visible in the console.
 */
export function findCardHost(parent: Element, win: Window = window): Element | null {
  let host: Element | null = parent;
  while (host && host !== host.ownerDocument.body) {
    if (host.tagName.includes('-') &&
        win.getComputedStyle(host).display !== 'contents') {
      return host;
    }
    host = host.parentElement;
  }
  warnOnce(
    'findCardHost',
    'No custom-element ancestor found for a video card — lockup structure may have changed',
  );
  return null;
}
