// src/plugins/session-room/renderer-session/session-panel/chat-grouping.ts
import type { MemberKey } from '../../shared/types.js';

export function shouldShowFrom(prevSenderKey: MemberKey | undefined, currentSenderKey: MemberKey): boolean {
  return prevSenderKey !== currentSenderKey;
}
