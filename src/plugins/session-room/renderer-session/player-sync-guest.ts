import type { RendererContext } from '../../../types/plugins.js';
import type { PlayerState } from '../shared/types.js';
import { computeDrift, expectedHostPosition } from '../shared/player-position.js';
import { DRIFT_CORRECT_THRESHOLD_S } from '../shared/constants.js';
import { observeAdState } from './ad-detector.js';

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

export function setupGuestPlayerSync(ctx: RendererContext, isHost: () => boolean): () => void {
  let myAdState = false;
  const stopAd = observeAdState((v) => { myAdState = v; });

  let videoEl: HTMLVideoElement | null = null;
  const rebindVideo = async () => {
    const el = await waitForElement('video', 5_000);
    if (!el || el === videoEl) return;
    videoEl = el as HTMLVideoElement;
  };
  document.addEventListener('yt-navigate-finish', () => { void rebindVideo(); });
  window.addEventListener('load', () => { void rebindVideo(); });
  void rebindVideo();

  const myVideoIdFromUrl = (): string | null => {
    try { return new URL(location.href).searchParams.get('v'); }
    catch { return null; }
  };

  const onPlayerState = (event: PlayerState) => {
    if (isHost()) return;
    if (!videoEl) return;
    // Different video — main process handles via webContents.loadURL; renderer
    // skips until the new page loads and this listener re-fires with a matching
    // URL. Host's IFrame Player API methods are silently absent until polymer
    // boots, so the <video> element is the reliable surface for play/pause/seek.
    if (myVideoIdFromUrl() !== event.videoId) return;

    const wasPlaying = !videoEl.paused && !videoEl.ended;
    const stateChanged = wasPlaying !== event.isPlaying;

    if (event.isPlaying) {
      const target = expectedHostPosition(event, Date.now());
      const drift = videoEl.currentTime - target;
      // Apply seek only on real transitions (play↔pause toggle) or when drift
      // exceeds the threshold. Sub-threshold drift would otherwise jitter
      // playback on every host event; the 30s DRIFT_CHECK heartbeat catches
      // anything we let slide here.
      if (stateChanged || Math.abs(drift) > DRIFT_CORRECT_THRESHOLD_S) {
        videoEl.currentTime = target;
      }
      if (!wasPlaying) {
        void videoEl.play().catch(() => {});
      }
    } else {
      const drift = videoEl.currentTime - event.position;
      if (stateChanged || Math.abs(drift) > DRIFT_CORRECT_THRESHOLD_S) {
        videoEl.currentTime = event.position;
      }
      if (wasPlaying) videoEl.pause();
    }
  };

  const onDrift = (msg: { videoId: string; position: number; ts: number }) => {
    if (isHost()) return;
    if (myAdState) return;
    if (!videoEl) return;
    if (myVideoIdFromUrl() !== msg.videoId) return;
    const drift = computeDrift(msg, videoEl.currentTime, Date.now());
    if (Math.abs(drift) > DRIFT_CORRECT_THRESHOLD_S) {
      videoEl.currentTime = msg.position + (Date.now() - msg.ts) / 1000;
    }
  };

  ctx.ipc.on('event', (event) => {
    const e = event as { type: string; payload: unknown };
    if (e.type === 'PLAYER_STATE') onPlayerState(e.payload as PlayerState);
    else if (e.type === 'DRIFT_CHECK') onDrift(e.payload as { videoId: string; position: number; ts: number });
  });

  return () => {
    stopAd();
  };
}
