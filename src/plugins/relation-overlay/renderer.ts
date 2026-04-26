import { ipcRenderer } from 'electron';
import type { RendererContext } from '../../types/plugins.js';
import type { VideoResponse } from './types.js';
import { createPanel, removePanel } from './components/panel.js';
import { setLocale, detectLocale, type Locale } from '../../i18n/index.js';

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
  let requestId = 0; // Monotonic counter to cancel stale requests

  async function onNavigate(force = false): Promise<void> {
    const videoId = extractVideoId();

    if (!videoId) {
      removePanel();
      currentVideoId = null;
      return;
    }

    if (videoId === currentVideoId && !force) return;
    currentVideoId = videoId;

    const myRequestId = ++requestId;

    removePanel();

    const lang = document.documentElement.lang || 'ko';

    const raw = (await ctx.ipc.invoke('fetch-video', {
      videoId,
      lang,
    })) as { data: VideoResponse } | null;

    if (myRequestId !== requestId) return;

    const data = raw?.data ?? null;
    if (!data || data.recordings.length === 0) return;

    const metadata = await waitForElement('ytd-watch-metadata');
    if (myRequestId !== requestId || !metadata) return;

    removePanel();

    const panel = await createPanel(data, videoId, lang, ctx);
    if (myRequestId !== requestId) return;

    metadata.parentElement?.insertBefore(panel, metadata.nextSibling);
  }

  // yt-navigate-finish is the primary event for YouTube SPA navigation
  document.addEventListener('yt-navigate-finish', () => {
    currentVideoId = null;
    void onNavigate(true);
  });

  // load as fallback for initial page load only
  window.addEventListener('load', () => void onNavigate());

  // Subscribe to cross-plugin data change broadcasts.
  // Uses raw ipcRenderer because ctx.ipc scopes to own plugin id.
  ipcRenderer.on('admin-video:data-changed', () => {
    currentVideoId = null;
    void onNavigate(true);
  });
  ipcRenderer.on('settings:changed', () => {
    currentVideoId = null;
    void onNavigate(true);
  });
  ipcRenderer.on('i18n:locale-changed', (_event, newLocale: Locale | null) => {
    setLocale(newLocale ?? detectLocale());
    currentVideoId = null;
    void onNavigate(true);
  });
}
