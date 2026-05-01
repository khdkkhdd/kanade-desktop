// src/plugins/session-room/shared/types.ts
export type RoomCode = string;
export type MemberKey = string;
export type ItemId = string;

export type Member = {
  memberKey: MemberKey;
  displayName: string;
  joinedAt: number;
  isHost: boolean;
};

export type QueueItem = {
  id: ItemId;
  videoId: string;
  videoTitle: string;
  channelName: string;
  videoDuration: number;
  addedBy: { memberKey: MemberKey; displayName: string };
  addedAt: number;
  priorityScore: number;
};

export type PlayerState = {
  videoId: string;
  position: number;
  isPlaying: boolean;
  isAd: boolean;
  ts: number;
};

export type ChatMessage = {
  id: string;
  text: string;
  from: { memberKey: MemberKey; displayName: string };
  ts: number;
};

export type PermissionMode = 'host-only' | 'playlist' | 'all';

export type QueueOp =
  | { op: 'add'; item: QueueItem }
  | { op: 'remove'; itemId: ItemId }
  | { op: 'reorder'; itemId: ItemId; toIndex: number }
  | { op: 'set-current'; itemId: ItemId | null }
  | { op: 'set-snapshot'; queue: QueueItem[]; currentItemId: ItemId | null }
  | { op: 'clear' };

export type SessionEvent =
  | { type: 'PLAYER_STATE'; payload: PlayerState }
  | { type: 'QUEUE_OP'; payload: QueueOp; senderMemberKey: MemberKey }
  | { type: 'CHAT'; payload: ChatMessage }
  | { type: 'PERMISSION_CHANGE'; payload: { mode: PermissionMode }; senderMemberKey: MemberKey }
  | { type: 'DRIFT_CHECK'; payload: { videoId: string; position: number; ts: number } };

export type PresenceMeta = {
  memberKey: MemberKey;
  displayName: string;
  joinedAt: number;
  isHost: boolean;
};

export type SessionState = {
  room: { code: RoomCode; createdAt: number } | null;
  myMemberKey: MemberKey;
  isHost: boolean;
  members: Map<MemberKey, Member>;
  queue: QueueItem[];
  currentItemId: ItemId | null;
  lastPlayerState: PlayerState | null;
  lastPlayerStateReceivedAt: number;
  permission: PermissionMode;
  chatMessages: ChatMessage[];
  myLastAddAt: number;
};
