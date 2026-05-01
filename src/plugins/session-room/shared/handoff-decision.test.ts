import { describe, it, expect } from 'vitest';
import { pickNextHost } from './handoff-decision.js';
import type { Member } from './types.js';

const m = (memberKey: string, joinedAt: number, isHost = false): Member => ({
  memberKey, joinedAt, isHost, displayName: memberKey,
});

describe('pickNextHost', () => {
  it('returns null when no non-host members', () => {
    expect(pickNextHost([m('A', 1000, true)])).toBeNull();
  });

  it('picks earliest joinedAt among non-hosts', () => {
    const members = [m('A', 1000, true), m('B', 3000), m('C', 2000)];
    expect(pickNextHost(members)?.memberKey).toBe('C');
  });

  it('breaks tie via memberKey alphabetical', () => {
    const members = [m('A', 1000, true), m('Z', 2000), m('B', 2000)];
    expect(pickNextHost(members)?.memberKey).toBe('B');
  });

  it('does not pick hosts even if they exist alongside guests', () => {
    const members = [m('A', 1000, true), m('B', 2000, true), m('C', 5000)];
    expect(pickNextHost(members)?.memberKey).toBe('C');
  });
});
