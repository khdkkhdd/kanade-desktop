// src/plugins/session-room/main/index.ts
import { BrowserWindow, shell } from 'electron';
import type { BackendContext } from '../../../types/plugins.js';
import { isSafeWebUrl } from '../../../lib/url-guard.js';
import { SessionStateStore } from './session-state.js';
import { RealtimeClient } from './realtime-client.js';
import { RoomController } from './room-controller.js';
import { QueueManager } from './queue-manager.js';
import { createSessionWindow } from './session-window.js';
import { setupIpc } from './ipc.js';
import { toIpcState } from './state-projection.js';
import { CATCHUP_BROADCAST_DELAY_MS, HOST_GRACE_MS } from '../shared/constants.js';
import { HandoffManager } from './handoff-manager.js';
import type { RealtimeStatus } from './realtime-client.js';
import { isYouTubeHost } from '../shared/is-youtube-host.js';
import { unwrapYouTubeRedirect } from '../shared/youtube-redirect.js';

export interface SessionRoomOptions {
  onSessionActiveChange?: (active: boolean) => void;
}

export async function setupSessionRoomMain(ctx: BackendContext, options?: SessionRoomOptions): Promise<void> {
  const store = new SessionStateStore();
  const realtime = new RealtimeClient();

  let prevActive = false;
  let prevStatus: RealtimeStatus | null = null;

  const notifyActiveChange = (): void => {
    const active = !!store.get().room;
    if (active !== prevActive) {
      // Entering a new room: clear connection-status closure so a stale
      // 'DISCONNECTED' from the previous session doesn't trigger a spurious
      // "연결 복구됨" toast on the first CONNECTED of the new session.
      if (active) prevStatus = null;
      prevActive = active;
      options?.onSessionActiveChange?.(active);
    }
  };

  const broadcastState = (): void => {
    const payload = toIpcState(store);
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('plugin:session-room:state-changed', payload);
    }
    notifyActiveChange();
  };

  const broadcastEvent = (event: unknown): void => {
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('plugin:session-room:event', event);
    }
  };

  const broadcastToast = (payload: { text: string; kind?: 'info' | 'warn' | 'error' }): void => {
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('plugin:session-room:toast', payload);
    }
  };

  const broadcastHostLoad = (args: { videoId: string }): void => {
    // Drive the host's session window with webContents.loadURL — same pattern as
    // the guest catch-up path below. Polymer's `#movie_player.loadVideoById` is
    // unreliable (PR4 learning #2: same trap as host-sync / guest-sync), so we
    // navigate the chrome-level URL instead.
    const url = `https://www.youtube.com/watch?v=${args.videoId}`;
    if (!sessionWinApi || sessionWinApi.window.isDestroyed()) return;
    // Sync the URL guard BEFORE loadURL so the resulting will-navigate isn't
    // bounced back to the browse window.
    sessionWinApi.setSyncedUrl(url);
    void sessionWinApi.window.webContents.loadURL(url)
      .catch((e) => console.warn('[session-room] host loadURL failed', e));
  };

  const routeToBrowse = (url: string): void => {
    // YouTube wraps external links as `youtube.com/redirect?q=<external>`.
    // Unwrap before deciding: if the target is non-YouTube, send it to the OS
    // browser instead of letting browse window auto-redirect there.
    const target = unwrapYouTubeRedirect(url);
    if (target !== url) {
      try {
        const t = new URL(target);
        if (!isYouTubeHost(t.hostname)) {
          if (t.protocol === 'http:' || t.protocol === 'https:') {
            void shell.openExternal(target);
          }
          return;
        }
        // unwrapped to another YouTube URL — fall through with the unwrapped value
      } catch {
        return;
      }
    }
    const finalUrl = target;
    const browseWin = ctx.window;
    if (!browseWin || browseWin.isDestroyed()) return;
    if (!isSafeWebUrl(finalUrl)) {
      console.warn('[session-room] routeToBrowse refused unsafe URL:', finalUrl);
      return;
    }
    if (browseWin.isMinimized()) browseWin.restore();
    browseWin.show();
    browseWin.focus();
    void browseWin.webContents.loadURL(finalUrl)
      .catch((e) => console.warn('[session-room] routeToBrowse loadURL failed', e));
  };

  let sessionWinApi: { window: BrowserWindow; setSyncedUrl: (u: string) => void } | null = null;

  const openSessionWindow = (opts: { roomCode: string; initialUrl: string }) => {
    sessionWinApi = createSessionWindow(opts, routeToBrowse);
    sessionWinApi.window.on('closed', () => {
      sessionWinApi = null;
      if (realtime.isConnected()) {
        void controller.leaveSession().catch((e) =>
          console.warn('[session-room] auto-leave on window close failed', e));
      }
    });
  };
  const closeSessionWindow = () => {
    if (sessionWinApi) sessionWinApi.window.close();
    sessionWinApi = null;
  };

  const controller = new RoomController({ store, realtime, openSessionWindow, closeSessionWindow });
  const queueMgr = new QueueManager({ store, broadcast: realtime.broadcast.bind(realtime), pushState: broadcastState });
  setupIpc({ ctx, controller, store, queue: queueMgr, realtime, pushState: broadcastState, broadcastHostLoad });

  // Renderer click-interceptor (Task 5.1) sends this when the user clicks a
  // YouTube link inside the session window. Route it to the browse window.
  ctx.ipc.on('routeToBrowse', (args) => {
    const { url } = args as { url: string };
    routeToBrowse(url);
  });

  // Browse window banner (Task 5.4) sends this to bring session window to front.
  ctx.ipc.on('showSessionWindow', () => {
    const win = sessionWinApi?.window;
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  const handoff = new HandoffManager({
    store,
    graceMs: HOST_GRACE_MS,
    onSelfPromote: () => {
      // Optimistic local: mark self as host in the members map and recompute.
      const s = store.get();
      const me = s.members.get(s.myMemberKey);
      if (!me) return;
      // We only flip self to isHost; we don't strip any existing isHost flag.
      // No two-host risk: onHostAbsenceStart fires on hostPresent transition
      // true→false, and the handoff timer's race re-check aborts if presence
      // sync brings the host back. By fire time, the absent host is already
      // gone from members (Supabase presence-sync drops vanished tabs).
      const updated = Array.from(s.members.values()).map((m) =>
        m.memberKey === s.myMemberKey ? { ...m, isHost: true } : m
      );
      store.setMembers(updated); // recomputes store.isHost
      // Tell the channel we are now host (eventually consistent presence sync).
      void realtime.updatePresence({ isHost: true })
        .catch((e) => console.warn('[session-room] handoff updatePresence failed', e));
      broadcastState();
      console.log('[session-room] self-promoted to host via handoff');
    },
  });

  let prevHostPresent = false;
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

    // Host absence tracking for handoff
    const hostPresent = members.some((m) => m.isHost);
    if (prevHostPresent && !hostPresent) handoff.onHostAbsenceStart();
    if (!prevHostPresent && hostPresent) handoff.onHostReturn();
    prevHostPresent = hostPresent;

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
              && sessionWinApi
              && event.payload.videoId
              && event.payload.videoId !== prev?.videoId) {
            const url = `https://www.youtube.com/watch?v=${event.payload.videoId}`;
            // Sync the URL guard BEFORE calling loadURL so that the will-navigate
            // event fired by this programmatic navigation is allowed through.
            sessionWinApi.setSyncedUrl(url);
            void sessionWinApi.window.webContents.loadURL(url)
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
          // No self-dedup: Supabase broadcast.self defaults to false (see realtime-client.ts
          // channel config), so this branch only fires for messages from OTHER members.
          // Sender's own message was already added by the chat.send IPC handler.
          store.addChat(event.payload);
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
      prevHostPresent = false;
      handoff.reset();
      broadcastState();
    }

    // Connection toasts — only when in a session
    if (store.get().room) {
      if (status === 'DISCONNECTED' && prevStatus === 'CONNECTED') {
        broadcastToast({ text: '연결 끊김. 재연결 시도 중…', kind: 'warn' });
      }
      if (status === 'CONNECTED' && prevStatus !== null && prevStatus !== 'CONNECTED') {
        broadcastToast({ text: '연결 복구됨', kind: 'info' });
      }
    }
    prevStatus = status;
  });

  console.log('[session-room] main plugin initialized');
}
