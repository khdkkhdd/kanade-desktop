// src/plugins/session-room/main/ipc.ts
import type { BackendContext } from '../../../types/plugins.js';
import type { RoomController } from './room-controller.js';
import type { SessionStateStore } from './session-state.js';

export interface IpcDeps {
  ctx: BackendContext;
  controller: RoomController;
  store: SessionStateStore;
}

export function setupIpc(deps: IpcDeps): void {
  const { ctx, controller, store } = deps;

  ctx.ipc.handle('create', async (args) => {
    const a = args as { displayName: string; initialVideoId: string | null };
    return controller.createSession(a);
  });

  ctx.ipc.handle('join', async (args) => {
    const a = args as { roomCode: string; displayName: string };
    try {
      return await controller.joinSession(a);
    } catch (e) {
      return { error: String((e as Error).message) };
    }
  });

  ctx.ipc.handle('leave', async () => {
    await controller.leaveSession();
    return {};
  });

  ctx.ipc.handle('getState', () => {
    const s = store.get();
    return {
      room: s.room,
      myMemberKey: s.myMemberKey,
      isHost: s.isHost,
      members: Array.from(s.members.values()),
      queue: s.queue,
      currentItemId: s.currentItemId,
      permission: s.permission,
      lastPlayerState: s.lastPlayerState,
      chatMessages: s.chatMessages,
    };
  });
}
