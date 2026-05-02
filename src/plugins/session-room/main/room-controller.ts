import { randomUUID } from 'node:crypto';
import type { SessionStateStore } from './session-state.js';
import type { RealtimeClient } from './realtime-client.js';
import type { SessionWindowOptions } from './session-window.js';
import { generateRoomCode, isValidRoomCode } from '../shared/room-code.js';
import type { MemberKey, RoomCode } from '../shared/types.js';

export interface RoomControllerDeps {
  store: SessionStateStore;
  realtime: RealtimeClient;
  openSessionWindow: (opts: SessionWindowOptions) => void;
  closeSessionWindow: () => void;
}

export class RoomController {
  constructor(private deps: RoomControllerDeps) {}

  async createSession(args: { displayName: string; initialVideoId: string | null }): Promise<{ roomCode: RoomCode; memberKey: MemberKey }> {
    const code = generateRoomCode();
    const memberKey = randomUUID();
    const displayName = args.displayName || this.fallbackName(memberKey);

    this.deps.store.initRoom({ code, myMemberKey: memberKey, isHost: true });
    try {
      await this.deps.realtime.connect(code, {
        memberKey,
        displayName,
        joinedAt: Date.now(),
        isHost: true,
      });
    } catch (err) {
      this.deps.store.reset();
      await this.deps.realtime.disconnect().catch(() => {});
      throw err;
    }

    const initialUrl = args.initialVideoId
      ? `https://www.youtube.com/watch?v=${args.initialVideoId}`
      : 'https://www.youtube.com';
    this.deps.openSessionWindow({ roomCode: code, initialUrl });
    return { roomCode: code, memberKey };
  }

  async joinSession(args: { roomCode: string; displayName: string }): Promise<{ memberKey: MemberKey }> {
    if (!isValidRoomCode(args.roomCode)) {
      throw new Error('invalid room code format');
    }
    const memberKey = randomUUID();
    const displayName = args.displayName || this.fallbackName(memberKey);

    this.deps.store.initRoom({ code: args.roomCode, myMemberKey: memberKey, isHost: false });
    try {
      await this.deps.realtime.connect(args.roomCode, {
        memberKey,
        displayName,
        joinedAt: Date.now(),
        isHost: false,
      });
    } catch (err) {
      this.deps.store.reset();
      await this.deps.realtime.disconnect().catch(() => {});
      throw err;
    }

    // Window opens with placeholder URL — real video will load via PLAYER_STATE handler in PR4.
    this.deps.openSessionWindow({ roomCode: args.roomCode, initialUrl: 'about:blank' });
    return { memberKey };
  }

  async leaveSession(): Promise<void> {
    await this.deps.realtime.disconnect();
    this.deps.closeSessionWindow();
    this.deps.store.reset();
  }

  private fallbackName(memberKey: MemberKey): string {
    return `Guest ${memberKey.slice(0, 4)}`;
  }
}
