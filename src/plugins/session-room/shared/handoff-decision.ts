import type { Member } from './types.js';

export function pickNextHost(members: Member[]): Member | null {
  const candidates = members.filter((m) => !m.isHost);
  if (candidates.length === 0) return null;

  return candidates.slice().sort((a, b) => {
    if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
    return a.memberKey < b.memberKey ? -1 : 1;
  })[0];
}
