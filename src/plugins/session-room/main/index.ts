// src/plugins/session-room/main/index.ts
import { BrowserWindow } from 'electron';
import type { BackendContext } from '../../../types/plugins.js';
import { SessionStateStore } from './session-state.js';
import { RealtimeClient } from './realtime-client.js';
import { RoomController } from './room-controller.js';
import { QueueManager } from './queue-manager.js';
import { createSessionWindow } from './session-window.js';
import { setupIpc } from './ipc.js';
import { toIpcState } from './state-projection.js';
import { CATCHUP_BROADCAST_DELAY_MS } from '../shared/constants.js';

export async function setupSessionRoomMain(ctx: BackendContext): Promise<void> {
  const store = new SessionStateStore();
  const realtime = new RealtimeClient();

  const broadcastState = (): void => {
    const payload = toIpcState(store);
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('plugin:session-room:state-changed', payload);
    }
  };

  const broadcastEvent = (event: unknown): void => {
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('plugin:session-room:event', event);
    }
  };

  const broadcastHostLoad = (args: { videoId: string }): void => {
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('plugin:session-room:host.loadVideo', args);
    }
  };

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
  const queueMgr = new QueueManager({ store, broadcast: realtime.broadcast.bind(realtime), pushState: broadcastState });
  setupIpc({ ctx, controller, store, queue: queueMgr, realtime, pushState: broadcastState, broadcastHostLoad });

  let previousMemberKeys = new Set<string>();
  realtime.onPresence((members) => {
    console.log(
      `[session-room] presence: ${members.length} member(s) — ${members.map((m) => `${m.displayName}${m.isHost ? '★' : ''}`).join(', ')}`,
    );
    store.setMembers(members);

    const newKeys = new Set(members.map((m) => m.memberKey));
    const me = store.get().myMemberKey;
    const newcomers = [...newKeys].filter((k) => !previousMemberKeys.has(k));
    previousMemberKeys = newKeys;

    if (store.get().isHost && newcomers.some((k) => k !== me)) {
      // channel-wide broadcast covers all newcomers in this presence delta
      setTimeout(() => {
        const lps = store.get().lastPlayerState;
        if (lps) {
          const now = Date.now();
          const updatedPosition = lps.isPlaying ? lps.position + (now - lps.ts) / 1000 : lps.position;
          void realtime.broadcast({ type: 'PLAYER_STATE', payload: { ...lps, position: updatedPosition, ts: now } })
            .catch((e) => console.warn('[session-room] catch-up player broadcast failed', e));
        }
        void queueMgr.broadcastSnapshot()
          .catch((e) => console.warn('[session-room] catch-up snapshot broadcast failed', e));
      }, CATCHUP_BROADCAST_DELAY_MS);
    }

    broadcastState();
  });

  realtime.onEvent(async (event) => {
    try {
      switch (event.type) {
        case 'QUEUE_OP':
          await queueMgr.applyOp(event.payload, event.senderMemberKey);
          break;
        case 'PLAYER_STATE': {
          const prev = store.get().lastPlayerState;
          store.setPlayerState(event.payload);
          // Guest: load the host's video into the session window when videoId changes
          // (covers initial about:blank → host's video, and host track-change advances).
          if (!store.get().isHost
              && sessionWin
              && event.payload.videoId
              && event.payload.videoId !== prev?.videoId) {
            const url = `https://www.youtube.com/watch?v=${event.payload.videoId}`;
            void sessionWin.webContents.loadURL(url)
              .catch((e) => console.warn('[session-room] guest session loadURL failed', e));
          }
          break;
        }
        case 'PERMISSION_CHANGE': {
          const sender = store.get().members.get(event.senderMemberKey);
          if (sender?.isHost) store.setPermission(event.payload.mode);
          break;
        }
        case 'DRIFT_CHECK':
          // No store update — guest renderers process directly via 'event' channel.
          break;
        case 'CHAT':
          // PR6 — accepted no-op for now to keep switch exhaustive.
          break;
        default: {
          const _exhaustive: never = event;
          void _exhaustive;
        }
      }
    } catch (e) {
      console.warn('[session-room] inbound event handler failed', event.type, e);
    }
    broadcastEvent(event);
    broadcastState();
  });

  realtime.onStatus((status) => {
    console.log(`[session-room] realtime status: ${status}`);
    if (status === 'DISCONNECTED') {
      previousMemberKeys = new Set();
    }
  });

  console.log('[session-room] main plugin initialized');
}
