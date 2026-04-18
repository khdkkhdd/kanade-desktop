import type { RecordingListItem } from '../types.js';
import { createVideoItem, type VideoItemOptions } from './video-item.js';

export interface ListSectionState {
  root: HTMLElement;
  appendItems: (items: RecordingListItem[]) => void;
  setNoMore: () => void;
}

/**
 * Builds a horizontal card list that calls `onReachEnd` when the user scrolls
 * near the right edge. Uses a scroll listener (more reliable than
 * IntersectionObserver for nested horizontal scroll containers in Electron).
 */
export function createListSection(
  onReachEnd: () => Promise<void>,
  itemOptions: VideoItemOptions = {},
): ListSectionState {
  const root = document.createElement('div');
  root.className = 'kanade-card-list';

  let active = true;

  function handleScroll(): void {
    if (!active) return;
    const distanceFromEnd = root.scrollWidth - (root.scrollLeft + root.clientWidth);
    if (distanceFromEnd < 120) void onReachEnd();
  }

  root.addEventListener('scroll', handleScroll, { passive: true });

  function appendItems(items: RecordingListItem[]): void {
    for (const item of items) {
      const el = createVideoItem(item, itemOptions);
      if (el) root.appendChild(el);
    }
    // If the initial fill doesn't overflow the viewport yet, trigger another
    // fetch so the list actually becomes scrollable.
    queueMicrotask(() => {
      if (active && root.scrollWidth <= root.clientWidth + 40) void onReachEnd();
    });
  }

  function setNoMore(): void {
    active = false;
    root.removeEventListener('scroll', handleScroll);
  }

  return { root, appendItems, setNoMore };
}
