import { For, Show } from 'solid-js';
import type { QueueItem, ItemId, PermissionMode, MemberKey } from '../../shared/types.js';

interface QueueTabProps {
  queue: QueueItem[];
  currentItemId: ItemId | null;
  isHost: boolean;
  myMemberKey: MemberKey;
  permission: PermissionMode;
  onRemove: (id: ItemId) => void;
  onReorder: (id: ItemId, toIndex: number) => void;
  onClear: () => void;
  onSetCurrent: (id: ItemId) => void;
  onPermissionChange: (mode: PermissionMode) => void;
}

export function QueueTab(p: QueueTabProps) {
  const canRemove = (item: QueueItem) => {
    if (p.isHost) return true;
    if (p.permission === 'all') return true;
    if (p.permission === 'host-only') return false;
    return item.addedBy.memberKey === p.myMemberKey;
  };

  const current = () => p.queue.find((i) => i.id === p.currentItemId) ?? null;
  const upcoming = () => p.queue.filter((i) => i.id !== p.currentItemId);

  return (
    <div class="kanade-queue-tab">
      <Show when={current()}>
        {(c) => (
          <div class="kanade-current">
            <div class="label">▶ 지금 재생</div>
            <div class="title">{c().videoTitle}</div>
            <div class="meta">by {c().addedBy.displayName} · {fmt(c().videoDuration)}</div>
          </div>
        )}
      </Show>
      <div class="kanade-list">
        <For each={upcoming()}>
          {(item) => (
            <div class="kanade-item">
              <div class="title">{item.videoTitle}</div>
              <div class="meta">by {item.addedBy.displayName} · {fmt(item.videoDuration)}</div>
              <Show when={p.isHost}>
                <button onClick={() => p.onSetCurrent(item.id)}>▶ 점프</button>
              </Show>
              <Show when={canRemove(item)}>
                <button onClick={() => p.onRemove(item.id)}>×</button>
              </Show>
            </div>
          )}
        </For>
      </div>
      <Show when={p.isHost}>
        <div class="kanade-host-controls">
          <button onClick={p.onClear}>큐 비우기</button>
          <select value={p.permission} onChange={(e) => p.onPermissionChange(e.currentTarget.value as PermissionMode)}>
            <option value="host-only">host-only</option>
            <option value="playlist">playlist</option>
            <option value="all">all</option>
          </select>
        </div>
      </Show>
    </div>
  );
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
