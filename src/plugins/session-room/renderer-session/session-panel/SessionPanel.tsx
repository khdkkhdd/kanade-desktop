import { createSignal, For, Show, createEffect } from 'solid-js';
import type { RendererContext } from '../../../../types/plugins.js';
import type { QueueItem, ItemId, PermissionMode, MemberKey, Member, PlayerState, ChatMessage } from '../../shared/types.js';
import { QueueTab } from './QueueTab.jsx';
import { ChatTab } from './ChatTab.jsx';
import { computeUnread } from './unread-chat.js';

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
  open: () => boolean;
  onToggle: () => void;
}

export function SessionPanel(p: PanelProps) {
  const [tab, setTab] = createSignal<'queue' | 'chat'>('queue');
  let lastSeenId: string | undefined = undefined;
  const [hasUnread, setHasUnread] = createSignal(false);

  createEffect(() => {
    const messages = p.state().chatMessages;
    const r = computeUnread({ lastSeenId, messages, currentTab: tab() });
    lastSeenId = r.newLastSeenId;
    setHasUnread(r.hasUnread);
  });

  const queueCount = () => p.state().queue.length;

  return (
    <div class={`kanade-session-panel ${p.open() ? 'open' : 'closed'}`}>
      <button class="kanade-toggle" onClick={p.onToggle}>
        {p.open() ? '▶' : '◀'}
        <Show when={!p.open() && hasUnread()}>
          <span class="kanade-toggle-dot" />
        </Show>
      </button>
      <Show when={p.open()}>
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
  );
}
