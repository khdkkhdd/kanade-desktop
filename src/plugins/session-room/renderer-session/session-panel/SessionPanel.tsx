import { createSignal, Show } from 'solid-js';
import type { RendererContext } from '../../../../types/plugins.js';
import type { QueueItem, ItemId, PermissionMode, MemberKey, Member } from '../../shared/types.js';
import { QueueTab } from './QueueTab.jsx';

export interface PanelState {
  queue: QueueItem[];
  currentItemId: ItemId | null;
  members: Member[];
  isHost: boolean;
  myMemberKey: MemberKey;
  permission: PermissionMode;
  roomCode: string;
}

export function SessionPanel(props: { ctx: RendererContext; state: () => PanelState }) {
  const [tab, setTab] = createSignal<'queue' | 'chat'>('queue');
  const [open, setOpen] = createSignal(true);

  return (
    <div class={`kanade-session-panel ${open() ? 'open' : 'closed'}`}>
      <button class="kanade-toggle" onClick={() => setOpen((v) => !v)}>{open() ? '▶' : '◀'}</button>
      <Show when={open()}>
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
            onRemove={(id) => { void props.ctx.ipc.invoke('queue.remove', { itemId: id }).catch(console.warn); }}
            onReorder={(id, toIndex) => { void props.ctx.ipc.invoke('queue.reorder', { itemId: id, toIndex }).catch(console.warn); }}
            onClear={() => { void props.ctx.ipc.invoke('queue.clear').catch(console.warn); }}
            onSetCurrent={(id) => { void props.ctx.ipc.invoke('queue.setCurrent', { itemId: id }).catch(console.warn); }}
            onPermissionChange={(mode) => { void props.ctx.ipc.invoke('permission.set', { mode }).catch(console.warn); }}
          />
        </Show>
        <Show when={tab() === 'chat'}>
          <div>채팅 (PR6)</div>
        </Show>
        <div class="kanade-presence">
          {props.state().members.map((m) => (
            <span class={m.isHost ? 'host' : ''}>{m.isHost ? '👑 ' : ''}{m.displayName}</span>
          ))}
        </div>
      </Show>
    </div>
  );
}
