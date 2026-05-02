import type {
  SessionState, QueueItem, ItemId, Member, ChatMessage,
  PlayerState, PermissionMode, RoomCode, MemberKey,
} from '../shared/types.js';
import { CHAT_BUFFER_MAX } from '../shared/constants.js';

export class SessionStateStore {
  private state: SessionState;

  constructor() {
    this.state = this.makeInitial();
  }

  private makeInitial(): SessionState {
    return {
      room: null,
      myMemberKey: '',
      isHost: false,
      members: new Map(),
      queue: [],
      currentItemId: null,
      lastPlayerState: null,
      lastPlayerStateReceivedAt: 0,
      permission: 'playlist',
      chatMessages: [],
      myLastAddAt: 0,
    };
  }

  get(): Readonly<SessionState> {
    return this.state;
  }

  initRoom(args: { code: RoomCode; myMemberKey: MemberKey; isHost: boolean }): void {
    this.state.room = { code: args.code, createdAt: Date.now() };
    this.state.myMemberKey = args.myMemberKey;
    this.state.isHost = args.isHost;
  }

  reset(): void {
    this.state = this.makeInitial();
  }

  addQueueItem(item: QueueItem): void {
    this.state.queue = [...this.state.queue, item].sort((a, b) => a.priorityScore - b.priorityScore);
  }

  removeQueueItem(itemId: ItemId): void {
    this.state.queue = this.state.queue.filter((i) => i.id !== itemId);
  }

  reorderQueueItem(itemId: ItemId, newScore: number): void {
    this.state.queue = this.state.queue
      .map((i) => (i.id === itemId ? { ...i, priorityScore: newScore } : i))
      .sort((a, b) => a.priorityScore - b.priorityScore);
  }

  setCurrentItem(itemId: ItemId | null): void {
    this.state.currentItemId = itemId;
    if (itemId) {
      // move to head implicitly — currentItemId tracks separately, queue.filter to remove
      this.state.queue = this.state.queue.filter((i) => i.id !== itemId);
    }
  }

  setSnapshot(args: { queue: QueueItem[]; currentItemId: ItemId | null }): void {
    this.state.queue = args.queue.slice().sort((a, b) => a.priorityScore - b.priorityScore);
    this.state.currentItemId = args.currentItemId;
  }

  clearQueue(): void {
    this.state.queue = [];
  }

  /**
   * Replaces the members map. Also recomputes isHost from the new presence
   * data — this is how host handoff (PR6) propagates to local state.
   */
  setMembers(members: Member[]): void {
    this.state.members = new Map(members.map((m) => [m.memberKey, m]));
    const me = this.state.members.get(this.state.myMemberKey);
    this.state.isHost = !!me?.isHost;
  }

  setPlayerState(state: PlayerState): void {
    this.state.lastPlayerState = state;
    this.state.lastPlayerStateReceivedAt = Date.now();
  }

  setPermission(mode: PermissionMode): void {
    this.state.permission = mode;
  }

  addChat(msg: ChatMessage): void {
    const next = [...this.state.chatMessages, msg];
    if (next.length > CHAT_BUFFER_MAX) {
      this.state.chatMessages = next.slice(next.length - CHAT_BUFFER_MAX);
    } else {
      this.state.chatMessages = next;
    }
  }

  setMyLastAddAt(ts: number): void {
    this.state.myLastAddAt = ts;
  }
}
