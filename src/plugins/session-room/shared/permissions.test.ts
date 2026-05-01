import { describe, it, expect } from 'vitest';
import { canApplyQueueOp, canBroadcastPlayerState, canChangePermission } from './permissions.js';
import type { QueueItem, QueueOp, PermissionMode } from './types.js';

const item = (memberKey: string): QueueItem => ({
  id: `i_${memberKey}`,
  videoId: 'v',
  videoTitle: 't',
  channelName: 'c',
  videoDuration: 200,
  addedBy: { memberKey, displayName: 'n' },
  addedAt: 0,
  priorityScore: 0,
});

describe('canApplyQueueOp — host', () => {
  it('allows all ops when sender is host', () => {
    for (const mode of ['host-only', 'playlist', 'all'] as const) {
      const ops: QueueOp[] = [
        { op: 'add', item: item('A') },
        { op: 'remove', itemId: 'i_A' },
        { op: 'reorder', itemId: 'i_A', toIndex: 0 },
        { op: 'clear' },
        { op: 'set-current', itemId: 'i_A' },
        { op: 'set-snapshot', queue: [], currentItemId: null },
      ];
      for (const op of ops) {
        expect(canApplyQueueOp({ op, senderMemberKey: 'A', queue: [item('A')], senderIsHost: true, permission: mode })).toBe(true);
      }
    }
  });
});

describe('canApplyQueueOp — guest, host-only mode', () => {
  it('rejects all ops', () => {
    const ops: QueueOp[] = [
      { op: 'add', item: item('B') },
      { op: 'remove', itemId: 'i_B' },
      { op: 'reorder', itemId: 'i_B', toIndex: 0 },
      { op: 'set-current', itemId: 'i_B' },
      { op: 'clear' },
    ];
    for (const op of ops) {
      expect(canApplyQueueOp({ op, senderMemberKey: 'B', queue: [item('B')], senderIsHost: false, permission: 'host-only' })).toBe(false);
    }
  });
});

describe('canApplyQueueOp — guest, playlist mode', () => {
  it('allows add', () => {
    expect(canApplyQueueOp({ op: { op: 'add', item: item('B') }, senderMemberKey: 'B', queue: [], senderIsHost: false, permission: 'playlist' })).toBe(true);
  });

  it('allows remove of own item', () => {
    expect(canApplyQueueOp({ op: { op: 'remove', itemId: 'i_B' }, senderMemberKey: 'B', queue: [item('B')], senderIsHost: false, permission: 'playlist' })).toBe(true);
  });

  it('rejects remove of others items', () => {
    expect(canApplyQueueOp({ op: { op: 'remove', itemId: 'i_A' }, senderMemberKey: 'B', queue: [item('A')], senderIsHost: false, permission: 'playlist' })).toBe(false);
  });

  it('rejects reorder / set-current / clear / set-snapshot', () => {
    const ops: QueueOp[] = [
      { op: 'reorder', itemId: 'i_B', toIndex: 0 },
      { op: 'set-current', itemId: 'i_B' },
      { op: 'clear' },
      { op: 'set-snapshot', queue: [], currentItemId: null },
    ];
    for (const op of ops) {
      expect(canApplyQueueOp({ op, senderMemberKey: 'B', queue: [item('B')], senderIsHost: false, permission: 'playlist' })).toBe(false);
    }
  });
});

describe('canApplyQueueOp — guest, all mode', () => {
  it('allows add and remove of any item', () => {
    expect(canApplyQueueOp({ op: { op: 'add', item: item('B') }, senderMemberKey: 'B', queue: [], senderIsHost: false, permission: 'all' })).toBe(true);
    expect(canApplyQueueOp({ op: { op: 'remove', itemId: 'i_A' }, senderMemberKey: 'B', queue: [item('A')], senderIsHost: false, permission: 'all' })).toBe(true);
  });

  it('still rejects reorder / set-current / clear / set-snapshot', () => {
    const ops: QueueOp[] = [
      { op: 'reorder', itemId: 'i_A', toIndex: 0 },
      { op: 'set-current', itemId: 'i_A' },
      { op: 'clear' },
      { op: 'set-snapshot', queue: [], currentItemId: null },
    ];
    for (const op of ops) {
      expect(canApplyQueueOp({ op, senderMemberKey: 'B', queue: [item('A')], senderIsHost: false, permission: 'all' })).toBe(false);
    }
  });
});

describe('canBroadcastPlayerState', () => {
  it('only host can broadcast', () => {
    expect(canBroadcastPlayerState({ senderIsHost: true, permission: 'playlist' })).toBe(true);
    expect(canBroadcastPlayerState({ senderIsHost: false, permission: 'playlist' })).toBe(false);
  });

  it('all mode allows guest broadcast', () => {
    expect(canBroadcastPlayerState({ senderIsHost: false, permission: 'all' })).toBe(true);
  });
});

describe('canChangePermission', () => {
  it('only host', () => {
    expect(canChangePermission({ senderIsHost: true })).toBe(true);
    expect(canChangePermission({ senderIsHost: false })).toBe(false);
  });
});
