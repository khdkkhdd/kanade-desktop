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

  const dbg = (msg: string) => ctx.ipc.send('debug.log', `guest-sync: ${msg}`);

  let videoEl: HTMLVideoElement | null = null;
  const rebindVideo = async () => {
    const el = await waitForElement('video', 5_000);
    if (!el || el === videoEl) return;
    videoEl = el as HTMLVideoElement;
    dbg(`bound new <video>`);
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
    if (!videoEl) { dbg('apply skip: no <video>'); return; }
    const myVideoId = myVideoIdFromUrl();
    // Different video — main process handles via webContents.loadURL; renderer skips
    // until the new page loads and this listener re-fires with a matching URL.
    if (myVideoId !== event.videoId) {
      dbg(`apply skip: video mismatch (mine=${myVideoId}, host=${event.videoId})`);
      return;
    }
    if (event.isPlaying) {
      const target = expectedHostPosition(event, Date.now());
      videoEl.currentTime = target;
      void videoEl.play().catch((e) => dbg(`play() rejected: ${String(e)}`));
      dbg(`apply play target=${target}`);
    } else {
      videoEl.currentTime = event.position;
      videoEl.pause();
      dbg(`apply pause at ${event.position}`);
    }
  };

  const onDrift = (msg: { videoId: string; position: number; ts: number }) => {
    if (isHost()) return;
    if (myAdState) return;
    if (!videoEl) return;
    const myVideoId = myVideoIdFromUrl();
    if (myVideoId !== msg.videoId) return;
    const myPos = videoEl.currentTime;
    const drift = computeDrift(msg, myPos, Date.now());
    if (Math.abs(drift) > DRIFT_CORRECT_THRESHOLD_S) {
      const target = msg.position + (Date.now() - msg.ts) / 1000;
      videoEl.currentTime = target;
      dbg(`drift correct ${drift.toFixed(2)}s → seek ${target.toFixed(2)}`);
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
