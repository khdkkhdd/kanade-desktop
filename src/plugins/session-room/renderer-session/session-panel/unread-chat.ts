// src/plugins/session-room/renderer-session/session-panel/unread-chat.ts
type Tab = 'queue' | 'chat';

interface Args {
  lastSeenId: string | undefined;
  messages: ReadonlyArray<{ id: string }>;
  currentTab: Tab;
}

interface Result {
  hasUnread: boolean;
  newLastSeenId: string | undefined;
}

export function computeUnread(a: Args): Result {
  const lastId = a.messages[a.messages.length - 1]?.id;
  if (a.currentTab === 'chat') {
    // User is viewing chat — mark everything seen.
    return { hasUnread: false, newLastSeenId: lastId };
  }
  // Not on chat — unread iff there's a message newer than lastSeenId.
  const hasUnread = lastId !== undefined && lastId !== a.lastSeenId;
  return { hasUnread, newLastSeenId: a.lastSeenId };
}
