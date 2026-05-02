import type { RendererContext } from '../../../types/plugins.js';
import type { PlayerState } from '../shared/types.js';
import { computeDrift, expectedHostPosition } from '../shared/player-position.js';
import { DRIFT_CORRECT_THRESHOLD_S } from '../shared/constants.js';
import { observeAdState } from './ad-detector.js';

interface YTPlayer {
  getCurrentTime?(): number;
  getVideoData?(): { video_id: string };
  seekTo?(time: number, allowSeekAhead: boolean): void;
  pauseVideo?(): void;
  playVideo?(): void;
  loadVideoById?(videoId: string, startSeconds?: number): void;
}

export function setupGuestPlayerSync(ctx: RendererContext, isHost: () => boolean): () => void {
  let myAdState = false;
  const stopAd = observeAdState((v) => { myAdState = v; });

  const onPlayerState = (event: PlayerState) => {
    if (isHost()) return;
    const player = getPlayer();
    if (!player) return;
    const data = player.getVideoData?.();
    if (data?.video_id !== event.videoId) {
      const target = expectedHostPosition(event, Date.now());
      player.loadVideoById?.(event.videoId, target);
      return;
    }
    if (event.isPlaying) {
      player.playVideo?.();
      const target = expectedHostPosition(event, Date.now());
      player.seekTo?.(target, true);
    } else {
      player.seekTo?.(event.position, true);
      player.pauseVideo?.();
    }
  };

  const onDrift = (msg: { videoId: string; position: number; ts: number }) => {
    if (isHost()) return;
    if (myAdState) return; // ignore during own ad
    const player = getPlayer();
    if (!player) return;
    const data = player.getVideoData?.();
    if (data?.video_id !== msg.videoId) return;
    const myPos = player.getCurrentTime?.();
    if (myPos === undefined) return;
    const drift = computeDrift(msg, myPos, Date.now());
    if (Math.abs(drift) > DRIFT_CORRECT_THRESHOLD_S) {
      const target = msg.position + (Date.now() - msg.ts) / 1000;
      player.seekTo?.(target, true);
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

function getPlayer(): YTPlayer | null {
  return document.getElementById('movie_player') as unknown as YTPlayer | null;
}
