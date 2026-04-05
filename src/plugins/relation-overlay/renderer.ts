import type { RendererContext } from '../../types/plugins.js';
import type { VideoResponse } from './types.js';
import { createPanel, removePanel } from './components/panel.js';

function extractVideoId(): string | null {
  const param = new URLSearchParams(window.location.search).get('v');
  if (param) return param;

  const shortsMatch = window.location.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}

function waitForElement(selector: string, timeout = 10_000): Promise<Element | null> {
  const existing = document.querySelector(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

export function setupRenderer(ctx: RendererContext): void {
  let currentVideoId: string | null = null;

  async function onNavigate(): Promise<void> {
    const videoId = extractVideoId();

    // Skip if same video or not a video page
    if (!videoId || videoId === currentVideoId) return;
    currentVideoId = videoId;

    // Remove previous panel
    removePanel();

    const lang = document.documentElement.lang || 'ko';

    // Fetch video data
    const data = (await ctx.ipc.invoke('fetch-video', {
      videoId,
      lang,
    })) as VideoResponse | null;

    if (!data || data.songs.length === 0) return;

    // Bail if user navigated away while we were fetching
    if (extractVideoId() !== videoId) return;

    // Wait for YouTube's #below element to appear
    const below = await waitForElement('#below');
    if (!below) return;

    // Bail if user navigated away while waiting for DOM
    if (extractVideoId() !== videoId) return;

    const panel = await createPanel(data, videoId, lang, ctx);

    // Insert after #below
    below.parentElement?.insertBefore(panel, below.nextSibling);
  }

  // Listen for YouTube SPA navigation
  document.addEventListener('yt-navigate-finish', () => {
    currentVideoId = null; // Reset so we re-fetch on SPA nav
    void onNavigate();
  });

  window.addEventListener('load', () => void onNavigate());
  window.addEventListener('popstate', () => {
    currentVideoId = null;
    void onNavigate();
  });
}
