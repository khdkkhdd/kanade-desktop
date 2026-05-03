import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import { SessionPanel, type PanelState } from './session-panel/SessionPanel.jsx';
import { AdBanner } from './ad-banner.jsx';
import { setupHostPlayerSync } from './player-sync-host.js';
import { setupGuestPlayerSync } from './player-sync-guest.js';
import { observeAdState } from './ad-detector.js';
import { setupClickInterceptor } from './click-interceptor.js';
import { disableAutoplay } from './autoplay-disable.js';
import { mountToastContainer, showToast, type ToastKind } from '../renderer-shared/toast.jsx';

const STYLE = `
.kanade-session-panel {
  position: fixed;
  top: 56px;
  right: 0;
  bottom: 0;
  width: 340px;
  background: #181818;
  color: #fff;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  font-family: 'Roboto', sans-serif;
  font-size: 13px;
  transition: transform 0.2s ease;
}
.kanade-session-panel.closed { transform: translateX(310px); }
.kanade-toggle {
  position: absolute;
  left: -30px;
  top: 50%;
  width: 30px;
  height: 60px;
  background: #181818;
  color: #fff;
  border: none;
  border-radius: 6px 0 0 6px;
  cursor: pointer;
}
.kanade-tabs { display: flex; gap: 4px; padding: 8px; border-bottom: 1px solid #333; }
.kanade-tabs button { flex: 1; background: transparent; color: #aaa; border: none; padding: 8px; cursor: pointer; }
.kanade-tabs button.active { color: #fff; border-bottom: 2px solid #f00; }
.kanade-room-code { padding: 8px; border-bottom: 1px solid #333; font-size: 12px; }
.kanade-room-code code { background: #000; padding: 2px 6px; margin: 0 6px; }
.kanade-current { padding: 8px; border-bottom: 1px solid #333; }
.kanade-current .label { color: #f00; font-size: 11px; }
.kanade-list { flex: 1; overflow-y: auto; }
.kanade-item { padding: 8px; border-bottom: 1px solid #2a2a2a; display: flex; flex-direction: column; gap: 2px; }
.kanade-item .meta { color: #888; font-size: 11px; }
.kanade-host-controls { padding: 8px; display: flex; gap: 8px; border-top: 1px solid #333; }
.kanade-presence { padding: 8px; border-top: 1px solid #333; display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; }
.kanade-presence .host { color: gold; }
.kanade-handoff-pending { color: #ff9800; font-size: 11px; padding: 4px 0; width: 100%; }
.kanade-ad-banner {
  position: fixed;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.85);
  color: #fff;
  padding: 6px 12px;
  border-radius: 4px;
  z-index: 10000;
}
/* position: relative anchors the absolute new-message badge */
.kanade-chat { display: flex; flex-direction: column; height: 100%; flex: 1; min-height: 0; position: relative; }
.kanade-chat-list { flex: 1; overflow-y: auto; padding: 8px; min-height: 0; }
.kanade-chat-msg { margin-bottom: 6px; }
.kanade-chat-msg.mine { text-align: right; color: #5a3fff; }
.kanade-chat-msg .from { font-size: 10px; color: #888; }
.kanade-chat-msg .text { font-size: 13px; white-space: pre-wrap; }
.kanade-chat-input { padding: 8px; border-top: 1px solid #333; }
.kanade-chat-input textarea { width: 100%; background: #2a2a2a; border: none; padding: 6px; color: #fff; box-sizing: border-box; resize: none; font-family: inherit; font-size: 13px; min-height: 28px; }
.kanade-chat-newbadge {
  position: absolute;
  bottom: 56px;
  left: 50%;
  transform: translateX(-50%);
  background: #5a3fff;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 4px 12px;
  font-size: 11px;
  cursor: pointer;
  z-index: 1;
}
`;

export async function setupSessionRenderer(ctx: RendererContext): Promise<void> {
  if ((window as unknown as { kanadeMode?: string }).kanadeMode !== 'session') return;

  // preload runs before document.body / head exists. Wait for DOM ready.
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
  document.body.appendChild(root);

  type IpcMember = { memberKey: string; displayName: string; isHost: boolean };
  type IpcStateRaw = Record<string, unknown> & { room?: unknown; members?: IpcMember[] };

  let prevRaw: IpcStateRaw | null = null;
  const [state, setState] = createSignal<PanelState>(toPanelState({}));

  ctx.ipc.on('state-changed', (s) => {
    const raw = s as IpcStateRaw;

    // Diff against previous state (skip on first bootstrap)
    if (prevRaw !== null) {
      const prevHost = (prevRaw.members ?? []).find((m) => m.isHost);
      const newHost = (raw.members ?? []).find((m) => m.isHost);
      if (prevHost && newHost && prevHost.memberKey !== newHost.memberKey) {
        showToast(`Host 가 ${newHost.displayName} 로 변경되었습니다`, 'info');
      }
      if (prevRaw.room && !raw.room) {
        showToast('세션이 종료되었습니다', 'warn');
      }
    }
    prevRaw = raw;

    setState(toPanelState(raw));
  });

  ctx.ipc.on('toast', (p) => {
    const payload = p as { text: string; kind?: ToastKind };
    showToast(payload.text, payload.kind ?? 'info');
  });

  void ctx.ipc.invoke('getState').then(
    (s) => {
      if (prevRaw !== null) return; // state-changed arrived first
      prevRaw = s as IpcStateRaw;
      setState(toPanelState(s as Record<string, unknown>));
    },
    (e) => console.warn('[session-room] getState failed', e),
  );

  setupHostPlayerSync(ctx, () => state().isHost); // stop ignored — renderer lifetime
  setupGuestPlayerSync(ctx, () => state().isHost); // stop ignored — renderer lifetime
  setupClickInterceptor(
    (url) => ctx.ipc.send('routeToBrowse', { url }),
    () => state().lastPlayerState?.videoId ?? null,
  ); // stop ignored — renderer lifetime

  const [iAmInAd, setIAmInAd] = createSignal(false);
  observeAdState(setIAmInAd); // stop ignored — renderer lifetime
  disableAutoplay(); // stop ignored — renderer lifetime

  const hostInAd = () => state().lastPlayerState?.isAd ?? false;

  // Lift panel open state so Cmd+Shift+P keydown can toggle it from outside SessionPanel.
  const [panelOpen, setPanelOpen] = createSignal(true);

  // Gap D: Cmd+Shift+P (macOS) / Ctrl+Shift+P (Win/Linux) toggles the session panel.
  // Bound here (session renderer) so it only fires when the session window is active,
  // not from the browse window.
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const onKeydown = (e: KeyboardEvent) => {
    const cmd = isMac ? e.metaKey : e.ctrlKey;
    if (cmd && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
      e.preventDefault();
      setPanelOpen((v) => !v);
    }
  };
  document.addEventListener('keydown', onKeydown, true);
  // no cleanup — renderer lifetime

  // host.loadVideo IPC removed — main now drives the session window directly
  // via webContents.loadURL in broadcastHostLoad (same pattern as guest catch-up).

  render(
    () => (
      <>
        <SessionPanel ctx={ctx} state={state} open={panelOpen} onToggle={() => setPanelOpen((v) => !v)} />
        <AdBanner hostInAd={hostInAd()} iAmInAd={iAmInAd()} />
      </>
    ),
    root,
  );

  console.log('[session-room] session renderer started');
}

function toPanelState(raw: Record<string, unknown>): PanelState {
  return {
    queue: (raw.queue as PanelState['queue']) ?? [],
    currentItemId: (raw.currentItemId as PanelState['currentItemId']) ?? null,
    members: (raw.members as PanelState['members']) ?? [],
    isHost: !!raw.isHost,
    myMemberKey: (raw.myMemberKey as string) ?? '',
    permission: (raw.permission as PanelState['permission']) ?? 'playlist',
    roomCode: ((raw.room as { code?: string } | null)?.code) ?? '',
    lastPlayerState: (raw.lastPlayerState as PanelState['lastPlayerState']) ?? null,
    chatMessages: (raw.chatMessages as PanelState['chatMessages']) ?? [],
    isHostAbsent: !!raw.isHostAbsent,
  };
}
