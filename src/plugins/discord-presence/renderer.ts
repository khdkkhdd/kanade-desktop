import type { RendererContext } from '../../types/plugins.js';
import type { PlayerStateUpdate } from './types.js';
import { RENDERER_TIMEUPDATE_MIN_MS } from './constants.js';
import { extractDomTitle, extractDomChannel } from './dom-fallback.js';

function extractVideoId(): string | null {
  const param = new URLSearchParams(window.location.search).get('v');
  if (param) return param;
  const shortsMatch = window.location.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return shortsMatch[1];
  return null;
}

function waitForElement(selector: string, timeout = 5_000): Promise<Element | null> {
  const existing = document.querySelector(selector);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const t = setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); clearTimeout(t); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

export function setupRenderer(ctx: RendererContext): void {
  let videoEl: HTMLVideoElement | null = null;
  let cleanup: (() => void) | null = null;
  let lastDispatch = 0;

  function snapshot(video: HTMLVideoElement): PlayerStateUpdate | null {
    const videoId = extractVideoId();
    if (!videoId) return null;
    return {
      videoId,
      url: window.location.href,
      paused: video.paused,
      currentTime: video.currentTime,
      duration: video.duration,
      ended: video.ended,
      uiLang: document.documentElement.lang || 'ko',
      domTitle: extractDomTitle(),
      domChannel: extractDomChannel(),
    };
  }

  function dispatch(): void {
    if (!videoEl) return;
    const s = snapshot(videoEl);
    if (!s) return;
    ctx.ipc.send('update-player-state', s);
  }

  function dispatchThrottled(): void {
    const now = Date.now();
    if (now - lastDispatch < RENDERER_TIMEUPDATE_MIN_MS) return;
    lastDispatch = now;
    dispatch();
  }

  async function rebindVideo(): Promise<void> {
    const el = await waitForElement('video', 5_000);
    if (!el) return;
    if (el === videoEl) return;
    cleanup?.();
    const boundEl = el as HTMLVideoElement;
    videoEl = boundEl;
    const handlers: Array<[keyof HTMLMediaElementEventMap, () => void]> = [
      ['play', dispatch],
      ['pause', dispatch],
      ['seeked', dispatch],
      ['durationchange', dispatch],
      ['ended', () => ctx.ipc.send('clear-player')],
      ['timeupdate', dispatchThrottled],
    ];
    for (const [ev, h] of handlers) boundEl.addEventListener(ev, h);
    cleanup = () => {
      for (const [ev, h] of handlers) boundEl.removeEventListener(ev, h);
    };
    dispatch(); // initial
  }

  document.addEventListener('yt-navigate-finish', () => { void rebindVideo(); });
  window.addEventListener('load', () => { void rebindVideo(); });
}
