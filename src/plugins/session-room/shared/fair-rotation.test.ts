import { describe, it, expect } from 'vitest';
import { calculatePriority } from './fair-rotation.js';
import type { QueueItem } from './types.js';

const FAKE_ITEM = (memberKey: string, score: number, id = `i_${memberKey}_${score}`): QueueItem => ({
  id,
  videoId: 'v',
  videoTitle: 't',
  channelName: 'c',
  videoDuration: 200,
  addedBy: { memberKey, displayName: 'n' },
  addedAt: 0,
  priorityScore: score,
});

describe('calculatePriority', () => {
  it('first add by user → score 0', () => {
    expect(calculatePriority([], 'A')).toBe(0);
  });

  it('second add by same user with no other contributors → score = GAP', () => {
    expect(calculatePriority([FAKE_ITEM('A', 0)], 'A')).toBe(10000);
  });

  it('B adds first time when A already has one round 0 entry → score = max(round0) + 1', () => {
    expect(calculatePriority([FAKE_ITEM('A', 0)], 'B')).toBe(1);
  });

  it('B then adds again → B has 1 entry → round 1 → max(round1)=GAP if A had GAP, else GAP', () => {
    const queue = [FAKE_ITEM('A', 0), FAKE_ITEM('B', 1), FAKE_ITEM('A', 10000)];
    expect(calculatePriority(queue, 'B')).toBe(10001);
  });

  it('round-robin trace — A 3 adds then B 3 adds', () => {
    const q: QueueItem[] = [];
    const push = (m: string) => {
      const s = calculatePriority(q, m);
      q.push(FAKE_ITEM(m, s));
    };
    push('A'); push('A'); push('A');
    push('B'); push('B'); push('B');
    const sorted = [...q].sort((x, y) => x.priorityScore - y.priorityScore);
    const order = sorted.map((x) => `${x.addedBy.memberKey}-${x.priorityScore}`);
    expect(order).toEqual(['A-0', 'B-1', 'A-10000', 'B-10001', 'A-20000', 'B-20001']);
  });
});
