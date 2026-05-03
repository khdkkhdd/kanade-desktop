import { createSignal, For, Show } from 'solid-js';
import type { RendererContext } from '../../../../types/plugins.js';
import type { QueueItem, ItemId, PermissionMode, MemberKey, Member, PlayerState, ChatMessage } from '../../shared/types.js';
import { QueueTab } from './QueueTab.jsx';
import { ChatTab } from './ChatTab.jsx';

export interface PanelState {
  queue: QueueItem[];
  currentItemId: ItemId | null;
  members: Member[];
  isHost: boolean;
  myMemberKey: MemberKey;
  permission: PermissionMode;
  roomCode: string;
  lastPlayerState: PlayerState | null;
  chatMessages: ChatMessage[];
  isHostAbsent: boolean;
}

export function SessionPanel(props: { ctx: RendererContext; state: () => PanelState; open: () => boolean; onToggle: () => void }) {
  const [tab, setTab] = createSignal<'queue' | 'chat'>('queue');

  return (
    <div class={`kanade-session-panel ${props.open() ? 'open' : 'closed'}`}>
      <button class="kanade-toggle" onClick={props.onToggle}>{props.open() ? '▶' : '◀'}</button>
      <Show when={props.open()}>
        <div class="kanade-tabs">
          <button class={tab() === 'queue' ? 'active' : ''} onClick={() => setTab('queue')}>큐</button>
          <button class={tab() === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>채팅</button>
        </div>
        <div class="kanade-room-code">
          코드: <code>{props.state().roomCode}</code>
          <button onClick={() => { void navigator.clipboard.writeText(props.state().roomCode); }}>복사</button>
        </div>
        <Show when={tab() === 'queue'}>
          <QueueTab
            queue={props.state().queue}
            currentItemId={props.state().currentItemId}
            isHost={props.state().isHost}
            myMemberKey={props.state().myMemberKey}
            permission={props.state().permission}
            onRemove={(id) => { void props.ctx.ipc.invoke('queue.remove', { itemId: id }).catch((e) => console.warn('[session-room] queue.remove failed', e)); }}
            onReorder={(id, toIndex) => { void props.ctx.ipc.invoke('queue.reorder', { itemId: id, toIndex }).catch((e) => console.warn('[session-room] queue.reorder failed', e)); }}
            onClear={() => { void props.ctx.ipc.invoke('queue.clear').catch((e) => console.warn('[session-room] queue.clear failed', e)); }}
            onSetCurrent={(id) => { void props.ctx.ipc.invoke('queue.setCurrent', { itemId: id }).catch((e) => console.warn('[session-room] queue.setCurrent failed', e)); }}
            onPermissionChange={(mode) => { void props.ctx.ipc.invoke('permission.set', { mode }).catch((e) => console.warn('[session-room] permission.set failed', e)); }}
          />
        </Show>
        <Show when={tab() === 'chat'}>
          <ChatTab ctx={props.ctx} messages={props.state().chatMessages} myMemberKey={props.state().myMemberKey} />
        </Show>
        <div class="kanade-presence">
          <Show when={props.state().isHostAbsent}>
            <div class="kanade-handoff-pending">⚠️ Host 연결 끊김… 자동 승계 대기</div>
          </Show>
          <For each={props.state().members}>
            {(m) => (
              <span class={m.isHost ? 'host' : ''}>{m.isHost ? '👑 ' : ''}{m.displayName}</span>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
