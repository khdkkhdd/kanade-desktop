import { For, Show } from 'solid-js';
import type { QueueItem, ItemId, PermissionMode, MemberKey } from '../../shared/types.js';
import { t } from '../../../../i18n/index.js';

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

  const thumbUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/default.jpg`;

  return (
    <div class="kanade-queue-tab">
      <Show when={current()}>
        {(c) => (
          <div class="kanade-current-card">
            <div class="kanade-thumb-lg" style={{ 'background-image': `url(${thumbUrl(c().videoId)})` }}>
              <span class="kanade-play-arrow" />
            </div>
            <div class="kanade-current-info">
              <div class="kanade-current-label">{t('session.currentLabel')}</div>
              <div class="kanade-current-title">{c().videoTitle}</div>
              <div class="kanade-current-meta">{joinMeta([
                c().channelName,
                c().videoDuration > 0 ? fmt(c().videoDuration) : null,
                c().addedBy.displayName ? `by ${c().addedBy.displayName}` : null,
              ])}</div>
            </div>
          </div>
        )}
      </Show>
      <div class="kanade-queue-list">
        <For each={upcoming()}>
          {(item) => (
            <div class="kanade-queue-item">
              <div class="kanade-thumb-sm" style={{ 'background-image': `url(${thumbUrl(item.videoId)})` }} />
              <div class="kanade-queue-info">
                <div class="kanade-queue-title">{item.videoTitle}</div>
                <div class="kanade-queue-meta">{joinMeta([
                  item.channelName,
                  item.videoDuration > 0 ? fmt(item.videoDuration) : null,
                  item.addedBy.displayName ? `by ${item.addedBy.displayName}` : null,
                ])}</div>
              </div>
              <Show when={p.isHost}>
                <button class="kanade-icon-btn" title={t('session.queueJumpTitle')} onClick={() => p.onSetCurrent(item.id)}>▶</button>
              </Show>
              <Show when={canRemove(item)}>
                <button class="kanade-icon-btn" title={t('session.queueRemoveTitle')} onClick={() => p.onRemove(item.id)}>×</button>
              </Show>
            </div>
          )}
        </For>
      </div>
      <Show when={p.isHost}>
        <div class="kanade-host-controls">
          <button class="kanade-pill-btn" onClick={p.onClear}>{t('session.queueClear')}</button>
          <select class="kanade-pill-select" value={p.permission} onChange={(e) => p.onPermissionChange(e.currentTarget.value as PermissionMode)}>
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

function joinMeta(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' · ');
}
