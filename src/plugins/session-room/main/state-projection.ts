import type { SessionStateStore } from './session-state.js';

export function toIpcState(store: SessionStateStore) {
  const s = store.get();
  return {
    room: s.room,
    myMemberKey: s.myMemberKey,
    isHost: s.isHost,
    members: Array.from(s.members.values()),
    queue: s.queue,
    currentItemId: s.currentItemId,
    permission: s.permission,
    lastPlayerState: s.lastPlayerState,
    chatMessages: s.chatMessages,
  };
}
