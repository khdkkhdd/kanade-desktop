import { describe, it, expect, beforeEach } from 'vitest';
import { SessionStateStore } from './session-state.js';

describe('SessionStateStore', () => {
  let s: SessionStateStore;
  beforeEach(() => { s = new SessionStateStore(); });

  it('starts uninitialized', () => {
    expect(s.get().room).toBeNull();
    expect(s.get().queue).toEqual([]);
    expect(s.get().permission).toBe('playlist');
  });

  it('initRoom sets room + memberKey + isHost', () => {
    s.initRoom({ code: 'k7m3xq', myMemberKey: 'me', isHost: true });
    expect(s.get().room?.code).toBe('k7m3xq');
    expect(s.get().myMemberKey).toBe('me');
    expect(s.get().isHost).toBe(true);
  });

  it('addQueueItem appends sorted by priorityScore', () => {
    s.initRoom({ code: 'x', myMemberKey: 'me', isHost: true });
    s.addQueueItem({
      id: 'a', videoId: 'v1', videoTitle: 't', channelName: 'c',
      videoDuration: 200, addedBy: { memberKey: 'me', displayName: 'me' },
      addedAt: 0, priorityScore: 100,
    });
    s.addQueueItem({
      id: 'b', videoId: 'v2', videoTitle: 't', channelName: 'c',
      videoDuration: 200, addedBy: { memberKey: 'me', displayName: 'me' },
      addedAt: 0, priorityScore: 50,
    });
    expect(s.get().queue.map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('removeQueueItem removes by id', () => {
    s.initRoom({ code: 'x', myMemberKey: 'me', isHost: true });
    s.addQueueItem({ id: 'a', videoId: '', videoTitle: '', channelName: '', videoDuration: 0, addedBy: { memberKey: 'me', displayName: 'me' }, addedAt: 0, priorityScore: 0 });
    s.removeQueueItem('a');
    expect(s.get().queue).toEqual([]);
  });

  it('setSnapshot replaces queue + currentItemId', () => {
    s.initRoom({ code: 'x', myMemberKey: 'me', isHost: false });
    s.setSnapshot({
      queue: [{ id: 'q', videoId: '', videoTitle: '', channelName: '', videoDuration: 0, addedBy: { memberKey: 'h', displayName: 'h' }, addedAt: 0, priorityScore: 0 }],
      currentItemId: 'q',
    });
    expect(s.get().queue).toHaveLength(1);
    expect(s.get().currentItemId).toBe('q');
  });

  it('setMembers replaces members map and updates isHost', () => {
    s.initRoom({ code: 'x', myMemberKey: 'me', isHost: false });
    s.setMembers([
      { memberKey: 'me', displayName: 'm', joinedAt: 1, isHost: true },
      { memberKey: 'other', displayName: 'o', joinedAt: 2, isHost: false },
    ]);
    expect(s.get().isHost).toBe(true);
    expect(s.get().members.size).toBe(2);
  });

  it('addChat enforces 50-message FIFO buffer', () => {
    s.initRoom({ code: 'x', myMemberKey: 'me', isHost: false });
    for (let i = 0; i < 60; i++) {
      s.addChat({ id: `c${i}`, text: 't', from: { memberKey: 'me', displayName: 'm' }, ts: i });
    }
    expect(s.get().chatMessages).toHaveLength(50);
    expect(s.get().chatMessages[0].id).toBe('c10');
    expect(s.get().chatMessages[49].id).toBe('c59');
  });

  it('reset clears everything', () => {
    s.initRoom({ code: 'x', myMemberKey: 'me', isHost: true });
    s.addQueueItem({ id: 'a', videoId: '', videoTitle: '', channelName: '', videoDuration: 0, addedBy: { memberKey: 'me', displayName: 'me' }, addedAt: 0, priorityScore: 0 });
    s.reset();
    expect(s.get().room).toBeNull();
    expect(s.get().queue).toEqual([]);
  });
});
