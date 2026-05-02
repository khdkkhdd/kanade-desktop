// src/plugins/session-room/main/ipc.ts
import type { BackendContext } from '../../../types/plugins.js';
import type { RoomController } from './room-controller.js';
import type { SessionStateStore } from './session-state.js';
import type { QueueManager } from './queue-manager.js';
import { getSessionDisplayName } from '../../../config/store.js';
import { toIpcState } from './state-projection.js';

export interface IpcDeps {
  ctx: BackendContext;
  controller: RoomController;
  store: SessionStateStore;
  queue: QueueManager;
}

export function setupIpc(deps: IpcDeps): void {
  const { ctx, controller, store } = deps;

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
}
