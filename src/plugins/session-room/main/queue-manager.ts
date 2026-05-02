import { randomUUID } from 'node:crypto';
import type { SessionStateStore } from './session-state.js';
import type { SessionEvent, QueueOp, QueueItem, MemberKey } from '../shared/types.js';
import { calculatePriority } from '../shared/fair-rotation.js';
import { canApplyQueueOp } from '../shared/permissions.js';

interface QueueManagerDeps {
  store: SessionStateStore;
  broadcast: (event: SessionEvent) => Promise<void>;
}

export class QueueManager {
  constructor(private deps: QueueManagerDeps) {}

  async addLocal(meta: { videoId: string; videoTitle: string; channelName: string; videoDuration: number }): Promise<QueueItem> {
    const s = this.deps.store.get();
    const adderKey = s.myMemberKey;
    const me = s.members.get(adderKey);
    const item: QueueItem = {
      id: randomUUID(),
      videoId: meta.videoId,
      videoTitle: meta.videoTitle,
      channelName: meta.channelName,
      videoDuration: meta.videoDuration,
      addedBy: { memberKey: adderKey, displayName: me?.displayName ?? '' },
      addedAt: Date.now(),
      priorityScore: calculatePriority(s.queue, adderKey),
    };

    this.deps.store.addQueueItem(item);
    this.deps.store.setMyLastAddAt(item.addedAt);

    await this.deps.broadcast({
      type: 'QUEUE_OP',
      payload: { op: 'add', item },
      senderMemberKey: adderKey,
    });
    return item;
  }

  async removeLocal(itemId: string): Promise<void> {
    const s = this.deps.store.get();
    this.deps.store.removeQueueItem(itemId);
    await this.deps.broadcast({
      type: 'QUEUE_OP',
      payload: { op: 'remove', itemId },
      senderMemberKey: s.myMemberKey,
    });
  }

  async reorderLocal(itemId: string, toIndex: number): Promise<void> {
    const s = this.deps.store.get();
    const sorted = s.queue;
    const newScore = computeReorderScore(sorted, itemId, toIndex);
    this.deps.store.reorderQueueItem(itemId, newScore);
    await this.deps.broadcast({
      type: 'QUEUE_OP',
      payload: { op: 'reorder', itemId, toIndex },
      senderMemberKey: s.myMemberKey,
    });
  }

  async setCurrentLocal(itemId: string | null): Promise<void> {
    const s = this.deps.store.get();
    this.deps.store.setCurrentItem(itemId);
    await this.deps.broadcast({
      type: 'QUEUE_OP',
      payload: { op: 'set-current', itemId },
      senderMemberKey: s.myMemberKey,
    });
  }

  async clearLocal(): Promise<void> {
    const s = this.deps.store.get();
    this.deps.store.clearQueue();
    await this.deps.broadcast({
      type: 'QUEUE_OP',
      payload: { op: 'clear' },
      senderMemberKey: s.myMemberKey,
    });
  }

  async broadcastSnapshot(): Promise<void> {
    const s = this.deps.store.get();
    await this.deps.broadcast({
      type: 'QUEUE_OP',
      payload: { op: 'set-snapshot', queue: [...s.queue], currentItemId: s.currentItemId },
      senderMemberKey: s.myMemberKey,
    });
  }

  async applyOp(op: QueueOp, senderMemberKey: MemberKey): Promise<void> {
    const s = this.deps.store.get();
    const sender = s.members.get(senderMemberKey);
    const senderIsHost = !!sender?.isHost;

    if (!canApplyQueueOp({ op, senderMemberKey, queue: s.queue, senderIsHost, permission: s.permission })) {
      console.warn('[queue-manager] op rejected by permission', op, senderMemberKey);
      return;
    }

    if (op.op === 'add') {
      // Recompute priority locally to prevent score spoofing
      const recomputed = calculatePriority(s.queue, op.item.addedBy.memberKey);
      this.deps.store.addQueueItem({ ...op.item, priorityScore: recomputed });
    } else if (op.op === 'remove') {
      this.deps.store.removeQueueItem(op.itemId);
    } else if (op.op === 'reorder') {
      const newScore = computeReorderScore(s.queue, op.itemId, op.toIndex);
      this.deps.store.reorderQueueItem(op.itemId, newScore);
    } else if (op.op === 'set-current') {
      this.deps.store.setCurrentItem(op.itemId);
    } else if (op.op === 'set-snapshot') {
      this.deps.store.setSnapshot({ queue: op.queue, currentItemId: op.currentItemId });
    } else if (op.op === 'clear') {
      this.deps.store.clearQueue();
    }
  }
}

function computeReorderScore(queue: QueueItem[], itemId: string, toIndex: number): number {
  const sorted = queue.filter((q) => q.id !== itemId).sort((a, b) => a.priorityScore - b.priorityScore);
  const before = sorted[toIndex - 1]?.priorityScore;
  const after = sorted[toIndex]?.priorityScore;
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 10000;
  return (before + after) / 2;
}
