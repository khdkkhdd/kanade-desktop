// src/plugins/session-room/main/index.ts
import type { BackendContext } from '../../../types/plugins.js';
import { SessionStateStore } from './session-state.js';
import { RealtimeClient } from './realtime-client.js';
import { RoomController } from './room-controller.js';
import { createSessionWindow } from './session-window.js';
import { setupIpc } from './ipc.js';

function toIpcState(store: SessionStateStore) {
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
}

export async function setupSessionRoomMain(ctx: BackendContext): Promise<void> {
  const store = new SessionStateStore();
  const realtime = new RealtimeClient();

  let sessionWin: import('electron').BrowserWindow | null = null;
  const openSessionWindow = (opts: { roomCode: string; initialUrl: string }) => {
    sessionWin = createSessionWindow(opts);
    sessionWin.on('closed', () => {
      sessionWin = null;
      if (realtime.isConnected()) {
        void controller.leaveSession().catch((e) =>
          console.warn('[session-room] auto-leave on window close failed', e));
      }
    });
  };
  const closeSessionWindow = () => {
    if (sessionWin) sessionWin.close();
    sessionWin = null;
  };

  const controller = new RoomController({ store, realtime, openSessionWindow, closeSessionWindow });
  setupIpc({ ctx, controller, store });

  realtime.onPresence((members) => {
    store.setMembers(members);
    ctx.ipc.send('state-changed', toIpcState(store));
  });

  realtime.onEvent((event) => {
    // PR3+ will populate handlers (queue ops, chat, player state, permission change, drift check)
    ctx.ipc.send('event', event);
  });

  console.log('[session-room] main plugin initialized');
}
