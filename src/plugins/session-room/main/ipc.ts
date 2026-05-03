// src/plugins/session-room/main/ipc.ts
import type { BackendContext } from '../../../types/plugins.js';
import type { RoomController } from './room-controller.js';
import type { SessionStateStore } from './session-state.js';
import type { QueueManager } from './queue-manager.js';
import type { RealtimeClient } from './realtime-client.js';
import type { PermissionMode, PlayerState } from '../shared/types.js';
import { getSessionDisplayName } from '../../../config/store.js';
import { toIpcState } from './state-projection.js';

export interface IpcDeps {
  ctx: BackendContext;
  controller: RoomController;
  store: SessionStateStore;
  queue: QueueManager;
  realtime: RealtimeClient;
  pushState: () => void;
  broadcastHostLoad: (args: { videoId: string }) => void;
}

export function setupIpc(deps: IpcDeps): void {
  const { ctx, controller, store, pushState } = deps;

  ctx.ipc.handle('create', async (args) => {
    const a = args as { displayName: string; initialVideoId: string | null };
    return controller.createSession(a);
  });

  ctx.ipc.handle('join', async (args) => {
    const a = args as { roomCode: string; displayName: string };
    return controller.joinSession(a);
  });

  ctx.ipc.handle('leave', async () => {
    await controller.leaveSession();
    return {};
  });

  ctx.ipc.handle('getDisplayName', () => {
    return getSessionDisplayName();
  });

  ctx.ipc.handle('getState', () => {
    return toIpcState(store);
  });

  ctx.ipc.handle('queue.add', async (args) => {
    const a = args as { videoId: string; videoTitle: string; channelName: string; videoDuration: number };
    return deps.queue.addLocal(a);
  });

  ctx.ipc.handle('queue.remove', async (args) => {
    return deps.queue.removeLocal((args as { itemId: string }).itemId);
  });

  ctx.ipc.handle('queue.reorder', async (args) => {
    const a = args as { itemId: string; toIndex: number };
    return deps.queue.reorderLocal(a.itemId, a.toIndex);
  });

  ctx.ipc.handle('queue.setCurrent', async (args) => {
    return deps.queue.setCurrentLocal((args as { itemId: string | null }).itemId);
  });

  ctx.ipc.handle('queue.clear', async () => deps.queue.clearLocal());

  ctx.ipc.handle('permission.set', async (args) => {
    const a = args as { mode: PermissionMode };
    const s = store.get();
    if (!s.isHost) throw new Error('host only');
    store.setPermission(a.mode);
    pushState();
    await deps.realtime.broadcast({
      type: 'PERMISSION_CHANGE',
      payload: { mode: a.mode },
      senderMemberKey: s.myMemberKey,
    });
  });

  ctx.ipc.on('player.broadcastState', (state) => {
    const s = deps.store.get();
    if (!s.isHost) {
      console.log('[session-room] DEBUG broadcastState IPC ignored (not host)');
      return;
    }
    const ps = state as PlayerState;
    console.log('[session-room] DEBUG broadcastState IPC →', ps.videoId, 'playing=', ps.isPlaying, 'pos=', ps.position);
    void deps.realtime.broadcast({ type: 'PLAYER_STATE', payload: ps })
      .catch((e) => console.warn('[session-room] PLAYER_STATE broadcast failed', e));
    deps.store.setPlayerState(ps);
    pushState();
  });

  ctx.ipc.on('player.driftCheck', (payload) => {
    const s = deps.store.get();
    if (!s.isHost) return;
    void deps.realtime.broadcast({
      type: 'DRIFT_CHECK',
      payload: payload as { videoId: string; position: number; ts: number },
    }).catch((e) => console.warn('[session-room] DRIFT_CHECK broadcast failed', e));
  });

  ctx.ipc.on('player.trackEnded', () => {
    const s = deps.store.get();
    if (!s.isHost) return;
    const next = s.queue[0];
    if (!next) {
      // Empty queue: broadcast paused state with the last videoId so guests
      // don't receive an empty videoId (which would trigger loadVideoById(''))
      const lps = s.lastPlayerState;
      if (!lps) return; // never started — nothing to do
      void deps.realtime.broadcast({
        type: 'PLAYER_STATE',
        payload: { ...lps, isPlaying: false, position: lps.position, isAd: false, ts: Date.now() },
      }).catch((e) => console.warn('[session-room] track-end empty-queue broadcast failed', e));
      return;
    }
    void deps.queue.setCurrentLocal(next.id).catch((e) =>
      console.warn('[session-room] track-end setCurrent failed', e));
    deps.broadcastHostLoad({ videoId: next.videoId });
  });
}
