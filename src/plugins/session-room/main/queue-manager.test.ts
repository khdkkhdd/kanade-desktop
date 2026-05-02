import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueueManager } from './queue-manager.js';
import { SessionStateStore } from './session-state.js';

describe('QueueManager', () => {
  let store: SessionStateStore;
  let broadcast: ReturnType<typeof vi.fn>;
  let mgr: QueueManager;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new SessionStateStore();
    store.initRoom({ code: 'x', myMemberKey: 'me', isHost: true });
    store.setMembers([{ memberKey: 'me', displayName: 'me', joinedAt: 0, isHost: true }]);
    broadcast = vi.fn().mockResolvedValue(undefined);
    mgr = new QueueManager({ store, broadcast: broadcast as never });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('add — first add, score 0, broadcasts QUEUE_OP add', async () => {
    await mgr.addLocal({ videoId: 'v1', videoTitle: 't', channelName: 'c', videoDuration: 200 });
    expect(store.get().queue).toHaveLength(1);
    expect(store.get().queue[0].priorityScore).toBe(0);
    expect(broadcast).toHaveBeenCalledWith(expect.objectContaining({
      type: 'QUEUE_OP',
      payload: expect.objectContaining({ op: 'add' }),
    }));
  });

  it('add — applies fair rotation across users', async () => {
    await mgr.addLocal({ videoId: 'v1', videoTitle: 't', channelName: 'c', videoDuration: 200 });
    vi.advanceTimersByTime(5001); // Advance past the rate-limit window
    await mgr.addLocal({ videoId: 'v2', videoTitle: 't', channelName: 'c', videoDuration: 200 });
    expect(store.get().queue.map((i) => i.priorityScore)).toEqual([0, 10000]);
  });

  it('apply incoming add (from other member) — verifies priority', async () => {
    const item = {
      id: 'remote-1', videoId: 'r1', videoTitle: 't', channelName: 'c', videoDuration: 200,
      addedBy: { memberKey: 'other', displayName: 'o' }, addedAt: 0, priorityScore: 1,
    };
    await mgr.applyOp({ op: 'add', item }, 'other');
    expect(store.get().queue).toHaveLength(1);
  });

  it('apply incoming add — rejects if priority does not match calculated', async () => {
    // Sender claims priority 999 but should be 0
    const item = {
      id: 'spoof', videoId: 'r1', videoTitle: 't', channelName: 'c', videoDuration: 200,
      addedBy: { memberKey: 'other', displayName: 'o' }, addedAt: 0, priorityScore: 999,
    };
    await mgr.applyOp({ op: 'add', item }, 'other');
    // Recomputes locally; stored priorityScore should be 0
    expect(store.get().queue[0].priorityScore).toBe(0);
  });

  it('apply remove respects permission: guest can remove own item only (playlist)', async () => {
    store.addQueueItem({ id: 'a', videoId: '', videoTitle: '', channelName: '', videoDuration: 0, addedBy: { memberKey: 'guest', displayName: 'g' }, addedAt: 0, priorityScore: 0 });
    store.setMembers([
      { memberKey: 'me', displayName: 'me', joinedAt: 0, isHost: true },
      { memberKey: 'guest', displayName: 'g', joinedAt: 1, isHost: false },
    ]);
    await mgr.applyOp({ op: 'remove', itemId: 'a' }, 'guest');
    expect(store.get().queue).toEqual([]);
  });

  it('apply reorder rejected for guest', async () => {
    store.addQueueItem({ id: 'a', videoId: '', videoTitle: '', channelName: '', videoDuration: 0, addedBy: { memberKey: 'me', displayName: 'me' }, addedAt: 0, priorityScore: 0 });
    store.setMembers([
      { memberKey: 'me', displayName: 'me', joinedAt: 0, isHost: false },
      { memberKey: 'host', displayName: 'h', joinedAt: 0, isHost: true },
    ]);
    await mgr.applyOp({ op: 'reorder', itemId: 'a', toIndex: 0 }, 'guest');
    // Should be unchanged
    expect(store.get().queue).toHaveLength(1);
  });

  it('addLocal throws when within rate-limit window', async () => {
    await mgr.addLocal({ videoId: 'v1', videoTitle: 't', channelName: 'c', videoDuration: 200 });
    await expect(mgr.addLocal({ videoId: 'v2', videoTitle: 't', channelName: 'c', videoDuration: 200 }))
      .rejects.toThrow(/rate-limit:/);
  });
});
