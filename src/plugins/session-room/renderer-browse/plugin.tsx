// src/plugins/session-room/renderer-browse/plugin.tsx
import { render } from 'solid-js/web';
import { createSignal, createEffect } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { QueueItem } from '../shared/types.js';
import { CreateDialog, JoinDialog } from './dialogs.jsx';
import { SessionBanner } from './session-banner.jsx';
import { setupAddToQueueButtons } from './add-to-queue-button.js';
import { setupMuteMutex } from './mute-mutex.js';
import { fetchOembedMeta } from './youtube-meta.js';
import { mountToastContainer, showToast, type ToastKind } from '../renderer-shared/toast.jsx';
import { detectYouTubeTheme, subscribeYouTubeTheme } from '../shared/theme-detect.js';

const STYLE = `
.kanade-banner {
  position: fixed;
  top: 56px;
  left: 0;
  right: 0;
  background: #5a3fff;
  color: #fff;
  padding: 8px 16px;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Roboto', system-ui, sans-serif;
  font-size: 13px;
}
.kanade-banner-title {
  font-weight: 500;
}
.kanade-banner-spacer {
  flex: 1;
}
.kanade-banner-btn {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  color: #fff;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.kanade-banner-btn:hover {
  background: rgba(255,255,255,0.22);
}
.kanade-banner-add-btn {
  background: rgba(255,255,255,0.95);
  color: #5a3fff;
  border: none;
  padding: 4px 12px 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-family: inherit;
}
.kanade-banner-add-btn:hover:not(:disabled) {
  background: #fff;
}
.kanade-banner-add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.kanade-banner-add-ico {
  display: inline-flex;
  width: 16px;
  height: 16px;
  background: #5a3fff;
  color: #fff;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  line-height: 1;
}
.kanade-add-queue {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 100;
  padding: 4px 10px 4px 6px;
  background: rgba(0,0,0,0.85);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  align-items: center;
  gap: 4px;
  backdrop-filter: blur(8px);
  line-height: 1;
  cursor: pointer;
  font-family: 'Roboto', system-ui, sans-serif;
  display: none;
  pointer-events: none;
}
/* In a session: button is laid out and clickable, but starts at opacity:0.
 * The .kanade-hover class is toggled by a JS mousemove listener (see
 * add-to-queue-button.ts) — :hover would be unreliable across YouTube's
 * lockup variants. Button's own :hover keeps it visible while clicking. */
body[data-kanade-session="active"] .kanade-add-queue {
  display: inline-flex;
  opacity: 0;
  pointer-events: auto;
  transition: opacity 0.12s ease;
}
body[data-kanade-session="active"] .kanade-card-host.kanade-hover .kanade-add-queue,
body[data-kanade-session="active"] .kanade-add-queue:hover {
  opacity: 1;
}
.kanade-add-queue:hover {
  background: rgba(0,0,0,0.95);
  border-color: rgba(255,255,255,0.3);
}
.kanade-add-queue-ico {
  display: inline-flex;
  width: 14px;
  height: 14px;
  background: #ff0033;
  color: #fff;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
}
`;

export async function setupBrowseRenderer(ctx: RendererContext): Promise<void> {
  if ((window as unknown as { kanadeMode?: string }).kanadeMode === 'session') {
    return; // skip in session window
  }

  // preload runs before document.body exists. Wait until DOM is ready before
  // mounting the overlay root.
  if (!document.body) {
    await new Promise<void>((resolve) => {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
    });
  }

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  mountToastContainer();

  const root = document.createElement('div');
  root.id = 'kanade-session-overlay';
  document.body.appendChild(root);

  root.dataset.theme = detectYouTubeTheme();
  subscribeYouTubeTheme((theme) => {
    root.dataset.theme = theme;
  });

  const [createOpen, setCreateOpen] = createSignal(false);
  const [sessionActive, setSessionActive] = createSignal(false);
  const [joinOpen, setJoinOpen] = createSignal(false);
  const [hostName, setHostName] = createSignal('');
  const [memberCount, setMemberCount] = createSignal(0);
  const [defaultName, setDefaultName] = createSignal('');
  const [clipboardCode, setClipboardCode] = createSignal('');
  const [canAddCurrent, setCanAddCurrent] = createSignal(/^\/watch/.test(location.pathname));

  const updateAddCurrent = () => setCanAddCurrent(/^\/watch/.test(location.pathname));
  window.addEventListener('yt-navigate-finish', updateAddCurrent);
  window.addEventListener('popstate', updateAddCurrent);
  // no cleanup — renderer lifetime

  const tryReadClipboard = async (): Promise<void> => {
    try {
      const txt = (await navigator.clipboard.readText()).trim();
      if (/^[0-9a-z]{6}$/.test(txt)) setClipboardCode(txt);
      else setClipboardCode('');
    } catch (e) {
      // clipboard read denied or unavailable — keep clipboardCode empty
      console.warn('[session-room] clipboard read failed', e);
      setClipboardCode('');
    }
  };

  const refreshDisplayName = async (): Promise<void> => {
    try {
      const name = (await ctx.ipc.invoke('getDisplayName')) as string;
      setDefaultName(name ?? '');
    } catch (e) {
      console.warn('[session-room] getDisplayName failed', e);
      setDefaultName('');
    }
  };

  ctx.ipc.on('open-create-dialog', () => {
    void refreshDisplayName().then(() => setCreateOpen(true));
  });

  ctx.ipc.on('open-join-dialog', () => {
    void Promise.all([refreshDisplayName(), tryReadClipboard()]).then(() => setJoinOpen(true));
  });

  type IpcMember = { memberKey: string; displayName: string; isHost: boolean };
  type IpcState = { room: { code?: string } | null; members?: IpcMember[] };

  let prevState: IpcState | null = null;
  let selfLeaving = false; // suppress "session closed" toast on user-initiated leave
  const initiateLeave = (): void => {
    selfLeaving = true;
    void ctx.ipc.invoke('leave').catch((e) => {
      selfLeaving = false; // leave didn't actually happen — re-arm toast
      console.warn('[session-room] leave failed', e);
    });
  };

  async function readWatchPagePlayerMeta(
    videoId: string,
  ): Promise<{ title: string; channelName: string; duration: number }> {
    // No #movie_player query — polymer's getVideoData() / getDuration() are
    // the same flaky surface that drove player-sync to the raw <video>
    // element (PR4 learning #2). Use the HTML5 <video> for duration and
    // YouTube oEmbed for title + channel; both are stable.
    const videoEl = document.querySelector('video') as HTMLVideoElement | null;
    const duration = videoEl && Number.isFinite(videoEl.duration) && videoEl.duration > 0
      ? Math.floor(videoEl.duration)
      : 0;
    const oembed = await fetchOembedMeta(videoId);
    if (oembed) {
      return { title: oembed.title, channelName: oembed.channelName, duration };
    }
    return { title: videoId, channelName: '', duration };
  }

  async function addCurrentVideoToQueue(ctx: RendererContext): Promise<void> {
    const videoId = getCurrentVideoId();
    if (!videoId) {
      showToast('영상 정보를 찾을 수 없습니다', 'warn');
      return;
    }
    const meta = await readWatchPagePlayerMeta(videoId);

    try {
      await ctx.ipc.invoke('queue.add', {
        videoId,
        videoTitle: meta.title,
        channelName: meta.channelName,
        videoDuration: meta.duration,
      });
      showToast('큐에 추가됨', 'info');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const rateLimitMatch = msg.match(/rate-limit:(\d+)/);
      if (rateLimitMatch) {
        const remainingMs = parseInt(rateLimitMatch[1], 10) || 0;
        showToast(`${Math.ceil(remainingMs / 1000)}초 후 다시 추가할 수 있습니다`, 'warn');
      } else if (msg.includes('permission-denied:')) {
        showToast('Host 만 추가 가능', 'warn');
      } else {
        showToast('큐 추가 실패', 'error');
        console.warn('[session-room] queue.add (current) failed', e);
      }
    }
  }

  // Add the watch-page video to the queue and immediately promote it as the
  // session's "지금 재생". Used right after createSession when the host started
  // the session from a /watch URL — without this, the session has an empty
  // queue and the panel's "지금 재생" card stays hidden until the host manually
  // adds and ▶s a song.
  async function promoteInitialVideo(ctx: RendererContext, videoId: string): Promise<void> {
    const meta = await readWatchPagePlayerMeta(videoId);
    try {
      const item = (await ctx.ipc.invoke('queue.add', {
        videoId,
        videoTitle: meta.title,
        channelName: meta.channelName,
        videoDuration: meta.duration,
      })) as QueueItem;
      await ctx.ipc.invoke('queue.setCurrent', { itemId: item.id });
    } catch (e) {
      // Session is already created — failure here just means no auto-promote.
      // User can still add manually afterward.
      console.warn('[session-room] initial video promote failed', e);
    }
  }

  ctx.ipc.on('state-changed', (state) => {
    const s = state as IpcState;

    // Diff against previous state (skip on first bootstrap)
    if (prevState !== null) {
      const prevHost = (prevState.members ?? []).find((m) => m.isHost);
      const newHost = (s.members ?? []).find((m) => m.isHost);
      // Host changed: both exist and memberKey differs
      if (prevHost && newHost && prevHost.memberKey !== newHost.memberKey) {
        showToast(`Host 가 ${newHost.displayName} 로 변경되었습니다`, 'info');
      }
      // Session closed: previous room was non-null, new room is null.
      // Skip if the user themselves clicked Leave — only externally-induced
      // session ends should trigger the toast.
      if (prevState.room && !s.room) {
        if (!selfLeaving) {
          showToast('세션이 종료되었습니다', 'warn');
        }
        selfLeaving = false;
      }
    }
    prevState = s;

    setSessionActive(!!s.room);
    const members = s.members ?? [];
    const host = members.find((m) => m.isHost);
    setHostName(host?.displayName ?? '');
    setMemberCount(members.length);
  });

  // Menu actions (src/index.ts Session menu) fan out via webContents.send to
  // this renderer. Bounce them back as plugin IPC the main process actually
  // handles. (copy-code is handled main-side via ipcMain.emit because clipboard
  // API requires document focus that a native menu click can briefly steal.)
  ctx.ipc.on('show-session-window', () => {
    ctx.ipc.send('showSessionWindow');
  });
  ctx.ipc.on('add-current-video', () => {
    void addCurrentVideoToQueue(ctx);
  });
  ctx.ipc.on('leave', () => {
    initiateLeave();
  });

  ctx.ipc.on('toast', (p) => {
    const payload = p as { text: string; kind?: ToastKind };
    showToast(payload.text, payload.kind ?? 'info');
  });

  void ctx.ipc.invoke('getState').then(
    (state) => {
      if (prevState !== null) return; // state-changed arrived first
      const s = state as IpcState;
      prevState = s;
      setSessionActive(!!s.room);
      const members = s.members ?? [];
      const host = members.find((m) => m.isHost);
      setHostName(host?.displayName ?? '');
      setMemberCount(members.length);
    },
    (e) => console.warn('[session-room] getState failed', e),
  );

  setupAddToQueueButtons(ctx);
  setupMuteMutex(sessionActive); // stop ignored — renderer lifetime

  function getCurrentVideoId(): string | null {
    const m = location.href.match(/[?&]v=([\w-]{11})/);
    return m ? m[1] : null;
  }

  render(() => {
    // Mirror sessionActive onto a body data attribute so add-to-queue CSS
    // can hover-gate the +큐 button without a JS round-trip per card.
    createEffect(() => {
      if (sessionActive()) document.body.dataset.kanadeSession = 'active';
      else delete document.body.dataset.kanadeSession;
    });
    return (
    <>
      <SessionBanner
        active={sessionActive()}
        hostName={hostName()}
        memberCount={memberCount()}
        canAddCurrent={canAddCurrent()}
        onShowSession={() => ctx.ipc.send('showSessionWindow')}
        onLeave={initiateLeave}
        onAddCurrent={() => { void addCurrentVideoToQueue(ctx); }}
      />
      <CreateDialog
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
        defaultDisplayName={defaultName()}
        onSubmit={async (a) => {
          const initialVideoId = getCurrentVideoId();
          await ctx.ipc.invoke('create', {
            displayName: a.displayName,
            initialVideoId,
          });
          // Fire-and-forget — the session window is already open and loading
          // the video; we just need the queue + currentItem state to follow.
          // Awaiting here would block the dialog close on a couple of realtime
          // round-trips for no user benefit.
          if (initialVideoId) {
            void promoteInitialVideo(ctx, initialVideoId);
          }
        }}
      />
      <JoinDialog
        open={joinOpen()}
        onClose={() => setJoinOpen(false)}
        defaultDisplayName={defaultName()}
        defaultCode={clipboardCode()}
        onSubmit={async (a) => {
          await ctx.ipc.invoke('join', {
            displayName: a.displayName,
            roomCode: a.roomCode,
          });
        }}
      />
    </>
    );
  }, root);

  console.log('[session-room] browse renderer started');
}
