// src/plugins/session-room/renderer-session/player-sync-host.ts
import type { RendererContext } from '../../../types/plugins.js';
import { observeAdState } from './ad-detector.js';
import { DRIFT_CHECK_INTERVAL_MS } from '../shared/constants.js';

interface YTPlayer {
  getCurrentTime?(): number;
  getPlayerState?(): number; // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
  getVideoData?(): { video_id: string };
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

export function setupHostPlayerSync(ctx: RendererContext, isHost: () => boolean): () => void {
  let isAd = false;
  let driftInterval: number | null = null;
  let lastBroadcast = 0;

  const stopAd = observeAdState((v) => {
    isAd = v;
    if (isHost()) broadcast();
  });

  const broadcast = () => {
    if (!isHost()) return;
    const player = getPlayer();
    if (!player) return;
    const state = player.getPlayerState?.();
    if (state === undefined) return;
    const isPlaying = state === 1 || state === 3; // playing or buffering counts as playing
    const data = player.getVideoData?.();
    if (!data?.video_id) return;
    const position = player.getCurrentTime?.();
    if (position === undefined) return;
    ctx.ipc.send('player.broadcastState', {
      videoId: data.video_id,
      position,
      isPlaying,
      isAd,
      ts: Date.now(),
    });
    lastBroadcast = Date.now();
  };

  const onPlayerEvent = () => {
    if (!isHost()) return;
    // Throttle bursts
    if (Date.now() - lastBroadcast < 100) return;
    broadcast();
  };

  const onTrackEnded = () => {
    if (!isHost()) return;
    ctx.ipc.send('player.trackEnded', {});
  };

  // Listen on <video> element events
  let videoEl: HTMLVideoElement | null = null;
  let cleanupVideo: (() => void) | null = null;

  const rebindVideo = async () => {
    const el = await waitForElement('video', 5_000);
    if (!el || el === videoEl) return;
    cleanupVideo?.();
    videoEl = el as HTMLVideoElement;
    const evs: Array<keyof HTMLMediaElementEventMap> = ['play', 'playing', 'pause', 'seeked', 'ended'];
    for (const ev of evs) videoEl.addEventListener(ev, onPlayerEvent);
    videoEl.addEventListener('ended', onTrackEnded);
    cleanupVideo = () => {
      for (const ev of evs) videoEl?.removeEventListener(ev, onPlayerEvent);
      videoEl?.removeEventListener('ended', onTrackEnded);
    };
  };

  const onNavigate = () => { void rebindVideo(); onPlayerEvent(); };
  document.addEventListener('yt-navigate-finish', onNavigate);
  window.addEventListener('load', () => { void rebindVideo(); });
  void rebindVideo();

  // 30s drift heartbeat
  driftInterval = window.setInterval(() => {
    if (!isHost()) return;
    const player = getPlayer();
    if (!player) return;
    const data = player.getVideoData?.();
    if (!data?.video_id) return;
    const position = player.getCurrentTime?.();
    if (position === undefined) return;
    ctx.ipc.send('player.driftCheck', {
      videoId: data.video_id,
      position,
      ts: Date.now(),
    });
  }, DRIFT_CHECK_INTERVAL_MS);

  return () => {
    stopAd();
    cleanupVideo?.();
    document.removeEventListener('yt-navigate-finish', onNavigate);
    if (driftInterval) clearInterval(driftInterval);
  };
}

function getPlayer(): YTPlayer | null {
  return document.getElementById('movie_player') as unknown as YTPlayer | null;
}
