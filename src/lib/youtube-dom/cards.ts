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
 * Finds every custom-element ancestor with a real layout box that should be
 * treated as a card-hover target — innermost (e.g., ytd-thumbnail) up to the
 * outermost per-card container (e.g., ytd-video-renderer in search).
 *
 * Why multiple hosts: card layouts often have a small inner element that
 * wraps just the thumbnail and a larger outer element that wraps thumbnail +
 * text. Marking only the inner means hovering the title text doesn't trigger
 * the button (text is sibling of inner, not descendant). Marking BOTH lets
 * the hover detector's closest('.kanade-card-host') find an appropriate
 * host from any region of the card.
 *
 * Skipped:
 * - non-custom elements (plain divs etc.) — passed through silently
 * - custom elements with `display: contents` (e.g., homepage's
 *   yt-lockup-view-model) — no box, so they're not visual targets; climb past
 *
 * Stop rule: after marking, stop when the marked element has a sibling with
 * the same tagName. That signals "this is one item in a list of cards" — the
 * parent is a list container (ytd-rich-grid-row, ytd-section-list-renderer's
 * div#contents slot, etc.), and marking past this point would leak hover
 * across cards.
 *
 * Returns an empty array when no suitable ancestor exists; emits a warnOnce
 * signal so a silent layout regression is visible in the console.
 */
export function findCardHosts(parent: Element, win: Window = window): Element[] {
  const hosts: Element[] = [];
  let cur: Element | null = parent;
  while (cur && cur !== cur.ownerDocument.body) {
    if (cur.tagName.includes('-') &&
        win.getComputedStyle(cur).display !== 'contents') {
      hosts.push(cur);
      if (hasSiblingWithSameTag(cur)) break;
    }
    cur = cur.parentElement;
  }
  if (hosts.length === 0) {
    warnOnce(
      'findCardHosts',
      'No custom-element ancestor found for a video card — lockup structure may have changed',
    );
  }
  return hosts;
}

function hasSiblingWithSameTag(el: Element): boolean {
  const parent = el.parentElement;
  if (!parent) return false;
  const tag = el.tagName;
  for (const sib of parent.children) {
    if (sib !== el && sib.tagName === tag) return true;
  }
  return false;
}
