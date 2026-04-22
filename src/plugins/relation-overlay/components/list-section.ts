import type { RecordingListItem } from '../types.js';
import { createVideoItem, type VideoItemOptions } from './video-item.js';

export interface ListSectionState {
  root: HTMLElement;
  appendItems: (items: RecordingListItem[]) => void;
  setNoMore: () => void;
}

/**
 * Horizontal card list. Native scroll (trackpad swipe, shift+wheel) plus
 * prev/next overlay buttons for plain-mouse users. Fires onReachEnd when
 * the user scrolls near the right edge so the caller can fetch the next
 * page.
 */
export function createListSection(
  onReachEnd: () => Promise<void>,
  itemOptions: VideoItemOptions = {},
): ListSectionState {
  const wrap = document.createElement('div');
  wrap.className = 'kanade-card-list-wrap';

  const root = document.createElement('div');
  root.className = 'kanade-card-list';
  wrap.appendChild(root);

  const prevBtn = makeNavButton('prev');
  const nextBtn = makeNavButton('next');
  wrap.appendChild(prevBtn);
  wrap.appendChild(nextBtn);

  let active = true;

  function scrollByStep(direction: -1 | 1): void {
    const step = Math.max(root.clientWidth * 0.8, 200);
    root.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  prevBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    scrollByStep(-1);
  });
  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    scrollByStep(1);
  });

  function updateNavVisibility(): void {
    const scrollable = root.scrollWidth > root.clientWidth + 1;
    const atStart = root.scrollLeft <= 1;
    const atEnd = root.scrollLeft + root.clientWidth >= root.scrollWidth - 1;
    prevBtn.classList.toggle('is-hidden', !scrollable || atStart);
    nextBtn.classList.toggle('is-hidden', !scrollable || atEnd);
  }

  function onScroll(): void {
    updateNavVisibility();
    if (!active) return;
    const distanceFromEnd = root.scrollWidth - (root.scrollLeft + root.clientWidth);
    if (distanceFromEnd < 120) void onReachEnd();
  }

  root.addEventListener('scroll', onScroll, { passive: true });

  // When the list is first rendered or re-attached to a newly displayed
  // parent, scrollWidth/clientWidth only become meaningful after layout
  // runs. Re-check nav visibility on every resize so the buttons appear
  // as soon as the viewport has real dimensions.
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => updateNavVisibility());
    ro.observe(root);
  }

  function appendItems(items: RecordingListItem[]): void {
    for (const item of items) {
      const el = createVideoItem(item, itemOptions);
      if (el) root.appendChild(el);
    }
    // If the initial fill doesn't overflow the viewport yet, trigger another
    // fetch so the list actually becomes scrollable.
    queueMicrotask(() => {
      if (active && root.scrollWidth <= root.clientWidth + 40) void onReachEnd();
      updateNavVisibility();
    });
  }

  function setNoMore(): void {
    active = false;
  }

  return { root: wrap, appendItems, setNoMore };
}

// Chevron paths lifted straight from YouTube's horizontal-list arrows so
// our buttons inherit the exact icon geometry along with the shape classes.
const NEXT_PATH = 'M8.793 5.293a1 1 0 000 1.414L14.086 12l-5.293 5.293a1 1 0 101.414 1.414L16.914 12l-6.707-6.707a1 1 0 00-1.414 0Z';
const PREV_PATH = 'M15.207 5.293a1 1 0 010 1.414L9.914 12l5.293 5.293a1 1 0 11-1.414 1.414L7.086 12l6.707-6.707a1 1 0 011.414 0Z';

function makeNavButton(kind: 'prev' | 'next'): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `kanade-card-nav kanade-card-nav--${kind} is-hidden`;
  btn.setAttribute('aria-label', kind === 'prev' ? '이전' : '다음');
  const path = kind === 'prev' ? PREV_PATH : NEXT_PATH;
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="${path}" fill="currentColor"></path>
    </svg>
  `;
  return btn;
}
