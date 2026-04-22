// Lifecycle controller for the Kanade side panel. Owns:
//   - the mounted Solid widget's disposer
//   - a monotonically increasing `generation` used to invalidate in-flight
//     async work (content-area waits, renderer's navigation steps)
//
// External callers interact through `{ show, hide, mark, isValid }` and
// never touch the generation counter directly — this keeps the race-guard
// pattern in one place. Any await that sits between `mark()` and a DOM
// mutation should re-check `isValid(token)` right after the await.

import { render } from 'solid-js/web';
import type { RendererContext } from '../../types/plugins.js';
import { waitForElement } from './dom-utils.js';
import { ChannelWidget } from './components/ChannelWidget.js';

const KANADE_PANEL_ID = 'kanade-admin-channel-panel';
const CONTENT_SELECTOR = 'ytd-two-column-browse-results-renderer';

export interface PanelController {
  /** Mount the panel for the given channel (idempotent for the same channel). */
  show(externalId: string, channelName: string): Promise<void>;
  /** Unmount and restore native content; invalidates any in-flight show. */
  hide(): void;
  /** Capture the current generation for external async guards. */
  mark(): number;
  /** True iff no invalidating operation has run since `token` was captured. */
  isValid(token: number): boolean;
}

export function createPanelController(ctx: RendererContext): PanelController {
  let generation = 0;
  let disposePanel: (() => void) | null = null;

  function findContentArea(): HTMLElement | null {
    return document.querySelector(CONTENT_SELECTOR) as HTMLElement | null;
  }

  function pauseVideosIn(container: HTMLElement): void {
    // Hiding the content area with display:none does not pause <video>
    // playback (channel trailers continue playing audio), so pause explicitly.
    container.querySelectorAll('video').forEach((v) => {
      if (!v.paused) v.pause();
    });
  }

  function clearPanel(): void {
    disposePanel?.();
    disposePanel = null;
    document.getElementById(KANADE_PANEL_ID)?.remove();
  }

  function mountPanelElement(content: HTMLElement): HTMLElement | null {
    const panel = document.createElement('div');
    panel.id = KANADE_PANEL_ID;
    panel.className = 'kanade-channel-panel';
    const parent = content.parentElement;
    if (!parent) return null;
    parent.insertBefore(panel, content.nextSibling);
    return panel;
  }

  async function show(externalId: string, channelName: string): Promise<void> {
    const my = generation;

    let content = findContentArea();
    if (!content) {
      // Content area may not be mounted yet if the tab was clicked right
      // after SPA navigation — wait briefly. Re-check generation after the
      // await so a late resolve doesn't paint this channel's widget onto
      // a page the user has already navigated away from.
      content = (await waitForElement(CONTENT_SELECTOR, 2000)) as HTMLElement | null;
      if (my !== generation) return;
    }
    if (!content) return;

    pauseVideosIn(content);
    content.style.display = 'none';

    clearPanel();
    const panel = mountPanelElement(content);
    if (!panel) return;

    disposePanel = render(
      () => (
        <>
          <h2 class="kanade-channel-panel__title">이 채널의 아티스트</h2>
          <p class="kanade-channel-panel__subtitle">
            연결해 두면 이 채널의 영상 등록 시 해당 아티스트가 자동 추천됩니다.
          </p>
          <ChannelWidget ctx={ctx} externalId={externalId} channelName={channelName} />
        </>
      ),
      panel,
    );
  }

  function hide(): void {
    // Bump first: any in-flight show() sees the generation diverge at its
    // post-await check and bails before touching the DOM.
    generation++;
    const content = findContentArea();
    if (content) content.style.display = '';
    clearPanel();
  }

  return {
    show,
    hide,
    mark: () => generation,
    isValid: (token) => token === generation,
  };
}
