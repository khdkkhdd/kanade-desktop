import { describe, it, expect } from 'vitest';
import { computeUnread } from './unread-chat.js';

describe('computeUnread', () => {
  it('no unread on empty messages', () => {
    expect(computeUnread({ lastSeenId: undefined, messages: [], currentTab: 'queue' })).toEqual({
      hasUnread: false,
      newLastSeenId: undefined,
    });
  });

  it('marks unread when chat tab is not active and new id arrives', () => {
    const r = computeUnread({
      lastSeenId: 'a',
      messages: [{ id: 'a' }, { id: 'b' }],
      currentTab: 'queue',
    });
    expect(r.hasUnread).toBe(true);
    expect(r.newLastSeenId).toBe('a'); // not advanced — user hasn't seen it
  });

  it('clears unread when chat tab is active', () => {
    const r = computeUnread({
      lastSeenId: 'a',
      messages: [{ id: 'a' }, { id: 'b' }],
      currentTab: 'chat',
    });
    expect(r.hasUnread).toBe(false);
    expect(r.newLastSeenId).toBe('b'); // advanced — user is on chat tab
  });

  it('initial mount with messages and chat tab marks all seen', () => {
    const r = computeUnread({
      lastSeenId: undefined,
      messages: [{ id: 'a' }, { id: 'b' }],
      currentTab: 'chat',
    });
    expect(r.hasUnread).toBe(false);
    expect(r.newLastSeenId).toBe('b');
  });

  it('initial mount with messages and queue tab marks unread', () => {
    const r = computeUnread({
      lastSeenId: undefined,
      messages: [{ id: 'a' }, { id: 'b' }],
      currentTab: 'queue',
    });
    expect(r.hasUnread).toBe(true);
    expect(r.newLastSeenId).toBe(undefined);
  });
});
