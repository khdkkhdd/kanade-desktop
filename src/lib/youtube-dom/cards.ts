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
 *
 * Note: this returns true for both inner thumbnail anchors AND outer card-wide
 * wrapper anchors that happen to contain a thumbnail (e.g., the mix sidebar's
 * #wc-endpoint). Callers that need to skip wrappers should check
 * `isWrapperAnchor` separately.
 */
export function isThumbnailAnchor(a: HTMLAnchorElement): boolean {
  return a.querySelector(YT_SELECTORS.thumbnailIndicator) !== null;
}

/**
 * True when this anchor wraps another anchor — typical of card-wide wrappers
 * like ytd-playlist-panel-video-renderer's #wc-endpoint, where the outer
 * anchor encloses an inner #thumbnail anchor. Both share the same href.
 *
 * Use case: an injector wants to mark the OUTER card box as the hover host
 * (so hover-anywhere-on-card works), but only attach the actual button to the
 * INNER thumbnail anchor — otherwise the button is duplicated.
 */
export function isWrapperAnchor(a: HTMLAnchorElement): boolean {
  return a.querySelector('a') !== null;
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
