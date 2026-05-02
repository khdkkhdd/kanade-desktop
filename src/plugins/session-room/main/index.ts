// src/plugins/session-room/main/index.ts
import type { BackendContext } from '../../../types/plugins.js';
import { SessionStateStore } from './session-state.js';
import { RealtimeClient } from './realtime-client.js';
import { RoomController } from './room-controller.js';
import { createSessionWindow } from './session-window.js';
import { setupIpc } from './ipc.js';

export async function setupSessionRoomMain(ctx: BackendContext): Promise<void> {
  const store = new SessionStateStore();
  const realtime = new RealtimeClient();

  let sessionWin: import('electron').BrowserWindow | null = null;
  const openSessionWindow = (opts: { roomCode: string; initialUrl: string }) => {
    sessionWin = createSessionWindow(opts);
    sessionWin.on('closed', () => { sessionWin = null; });
  };
  const closeSessionWindow = () => {
    if (sessionWin) sessionWin.close();
    sessionWin = null;
  };

  const controller = new RoomController({ store, realtime, openSessionWindow, closeSessionWindow });
  setupIpc({ ctx, controller, store });

  console.log('[session-room] main plugin initialized');
}
