// src/plugins/session-room/renderer-session/player-sync-host.ts
import type { RendererContext } from '../../../types/plugins.js';
import { observeAdState } from './ad-detector.js';
import { DRIFT_CHECK_INTERVAL_MS } from '../shared/constants.js';

interface YTPlayer {
  getCurrentTime(): number;
  getPlayerState(): number; // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
  getVideoData(): { video_id: string };
  getDuration(): number;
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
    const state = player.getPlayerState();
    const isPlaying = state === 1 || state === 3; // playing or buffering counts as playing
    const data = player.getVideoData();
    if (!data?.video_id) return;
    ctx.ipc.send('player.broadcastState', {
      videoId: data.video_id,
      position: player.getCurrentTime(),
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

  // Listen on YouTube player events
  document.addEventListener('onStateChange', onPlayerEvent);
  // SPA navigation reset
  window.addEventListener('yt-navigate-finish', onPlayerEvent);

  // 30s drift heartbeat
  driftInterval = window.setInterval(() => {
    if (!isHost()) return;
    const player = getPlayer();
    if (!player) return;
    const data = player.getVideoData();
    if (!data?.video_id) return;
    ctx.ipc.send('player.driftCheck', {
      videoId: data.video_id,
      position: player.getCurrentTime(),
      ts: Date.now(),
    });
  }, DRIFT_CHECK_INTERVAL_MS);

  return () => {
    stopAd();
    document.removeEventListener('onStateChange', onPlayerEvent);
    window.removeEventListener('yt-navigate-finish', onPlayerEvent);
    if (driftInterval) clearInterval(driftInterval);
  };
}

function getPlayer(): YTPlayer | null {
  return document.getElementById('movie_player') as unknown as YTPlayer | null;
}
