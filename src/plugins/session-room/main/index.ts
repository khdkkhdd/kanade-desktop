// src/plugins/session-room/main/index.ts
import type { BackendContext } from '../../../types/plugins.js';
import { SessionStateStore } from './session-state.js';
import { RealtimeClient } from './realtime-client.js';
import { RoomController } from './room-controller.js';
import { QueueManager } from './queue-manager.js';
import { createSessionWindow } from './session-window.js';
import { setupIpc } from './ipc.js';
import { toIpcState } from './state-projection.js';

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
  const queueMgr = new QueueManager({ store, broadcast: realtime.broadcast.bind(realtime) });
  setupIpc({ ctx, controller, store, queue: queueMgr });

  realtime.onPresence((members) => {
    console.log(
      `[session-room] presence: ${members.length} member(s) — ${members.map((m) => `${m.displayName}${m.isHost ? '★' : ''}`).join(', ')}`,
    );
    store.setMembers(members);
    ctx.ipc.send('state-changed', toIpcState(store));
  });

  realtime.onEvent(async (event) => {
    try {
      if (event.type === 'QUEUE_OP') {
        await queueMgr.applyOp(event.payload, event.senderMemberKey);
      }
    } catch (e) {
      console.warn('[session-room] inbound event handler failed', event.type, e);
    }
    ctx.ipc.send('event', event);
    ctx.ipc.send('state-changed', toIpcState(store));
  });

  realtime.onStatus((status) => {
    console.log(`[session-room] realtime status: ${status}`);
  });

  console.log('[session-room] main plugin initialized');
}
