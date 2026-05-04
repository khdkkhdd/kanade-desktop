import { createSignal, For, Show, createEffect } from 'solid-js';
import type { RendererContext } from '../../../../types/plugins.js';
import type { QueueItem, ItemId, PermissionMode, MemberKey, Member, PlayerState, ChatMessage } from '../../shared/types.js';
import { QueueTab } from './QueueTab.jsx';
import { ChatTab } from './ChatTab.jsx';
import { computeUnread } from './unread-chat.js';
import type { PanelMode } from './use-panel-mode.js';

export interface PanelState {
  queue: QueueItem[];
  currentItemId: ItemId | null;
  members: Member[];
  isHost: boolean;
  myMemberKey: MemberKey;
  permission: PermissionMode;
  roomCode: string;
  hostName: string;
  lastPlayerState: PlayerState | null;
  chatMessages: ChatMessage[];
  isHostAbsent: boolean;
}

interface PanelProps {
  ctx: RendererContext;
  state: () => PanelState;
  mode: () => PanelMode;
  onToggle: () => void;
  onToggleHover: (hovered: boolean) => void;
  onPanelHover: (hovered: boolean) => void;
  onFocusInside: (inside: boolean) => void;
}

// host's broadcastHostLoad uses webContents.loadURL on track change, which
// re-mounts this component and wipes closure state. Persist lastSeenId in
// sessionStorage so the chat-unread cursor survives navigation within the
// same session window.
const LAST_SEEN_KEY = 'kanade-session-room:last-seen-chat-id';
function loadLastSeenId(): string | undefined {
  try { return sessionStorage.getItem(LAST_SEEN_KEY) ?? undefined; }
  catch { return undefined; }
}
function saveLastSeenId(v: string | undefined): void {
  try {
    if (v === undefined) sessionStorage.removeItem(LAST_SEEN_KEY);
    else sessionStorage.setItem(LAST_SEEN_KEY, v);
  } catch { /* storage disabled — fall back to in-memory only */ }
}

export function SessionPanel(p: PanelProps) {
  const [tab, setTab] = createSignal<'queue' | 'chat'>('queue');
  let lastSeenId: string | undefined = loadLastSeenId();
  const [hasUnread, setHasUnread] = createSignal(false);

  createEffect(() => {
    // Treat a closed panel as "not viewing chat" so messages arriving
    // while closed always light up the toggle dot, even if the user
    // last left the panel on the chat tab.
    const messages = p.state().chatMessages;
    const currentTab = p.mode() !== 'closed' ? tab() : 'queue';
    const r = computeUnread({ lastSeenId, messages, currentTab });
    if (r.newLastSeenId !== lastSeenId) {
      lastSeenId = r.newLastSeenId;
      saveLastSeenId(lastSeenId);
    }
    setHasUnread(r.hasUnread);
  });

  const queueCount = () => p.state().queue.length;
  const isOpen = () => p.mode() !== 'closed';

  return (
    <>
      <button
        class={`kanade-toggle ${isOpen() ? '' : 'closed'}`}
        onClick={p.onToggle}
        onMouseEnter={() => p.onToggleHover(true)}
        onMouseLeave={() => p.onToggleHover(false)}
      >
        {isOpen() ? '▶' : '◀'}
        <Show when={!isOpen() && hasUnread()}>
          <span class="kanade-toggle-dot" />
        </Show>
      </button>
      <div
        class={`kanade-session-panel ${isOpen() ? 'open' : 'closed'}`}
        onMouseEnter={() => p.onPanelHover(true)}
        onMouseLeave={() => p.onPanelHover(false)}
        on:focusin={() => p.onFocusInside(true)}
        on:focusout={(e: FocusEvent) => {
          const next = e.relatedTarget as Node | null;
          if (!(e.currentTarget as Element).contains(next)) {
            p.onFocusInside(false);
          }
        }}
      >
      <Show when={isOpen()}>
        <div class="kanade-panel-header">
          <div class="kanade-panel-title">{p.state().hostName} Room</div>
          <div class="kanade-panel-code-row">
            <code>{p.state().roomCode}</code>
            <button class="kanade-copy-btn" onClick={() => { void navigator.clipboard.writeText(p.state().roomCode); }}>⧉ 복사</button>
          </div>
        </div>
        <div class="kanade-panel-tabs">
          <button class={`kanade-tab ${tab() === 'queue' ? 'active' : ''}`} onClick={() => setTab('queue')}>
            큐 ({queueCount()})
          </button>
          <button class={`kanade-tab ${tab() === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
            채팅<Show when={hasUnread()}><span class="kanade-tab-dot" /></Show>
          </button>
        </div>
        <Show when={tab() === 'queue'}>
          <QueueTab
            queue={p.state().queue}
            currentItemId={p.state().currentItemId}
            isHost={p.state().isHost}
            myMemberKey={p.state().myMemberKey}
            permission={p.state().permission}
            onRemove={(id) => { void p.ctx.ipc.invoke('queue.remove', { itemId: id }).catch((e) => console.warn('[session-room] queue.remove failed', e)); }}
            onReorder={(id, toIndex) => { void p.ctx.ipc.invoke('queue.reorder', { itemId: id, toIndex }).catch((e) => console.warn('[session-room] queue.reorder failed', e)); }}
            onClear={() => { void p.ctx.ipc.invoke('queue.clear').catch((e) => console.warn('[session-room] queue.clear failed', e)); }}
            onSetCurrent={(id) => { void p.ctx.ipc.invoke('queue.setCurrent', { itemId: id }).catch((e) => console.warn('[session-room] queue.setCurrent failed', e)); }}
            onPermissionChange={(mode) => { void p.ctx.ipc.invoke('permission.set', { mode }).catch((e) => console.warn('[session-room] permission.set failed', e)); }}
          />
        </Show>
        <Show when={tab() === 'chat'}>
          <ChatTab ctx={p.ctx} messages={p.state().chatMessages} myMemberKey={p.state().myMemberKey} />
        </Show>
        <div class="kanade-presence">
          <Show when={p.state().isHostAbsent}>
            <div class="kanade-handoff-warn">⚠️ Host 연결 끊김… 자동 승계 대기</div>
          </Show>
          <For each={p.state().members}>
            {(m) => (
              <span class={`kanade-chip ${m.isHost ? 'host' : ''}`}>{m.isHost ? '👑 ' : ''}{m.displayName}</span>
            )}
          </For>
        </div>
      </Show>
      </div>
    </>
  );
}
