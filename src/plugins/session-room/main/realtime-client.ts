import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { SessionEvent, PresenceMeta } from '../shared/types.js';
import { CHANNEL_PREFIX } from '../shared/constants.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../shared/supabase-env.js';

type EventListener = (event: SessionEvent) => void;
type PresenceListener = (members: PresenceMeta[]) => void;

/**
 * Wraps Supabase Realtime channel + presence for collaborative-listening sessions.
 *
 * Lifecycle: construct → connect(roomCode, presence) → broadcast/listen → disconnect.
 * Single channel per instance. Calling connect() twice without disconnect() throws.
 *
 * Subscribe-then-track ordering: connect() resolves only after SUBSCRIBED, then
 * calls track(presence). A consumer that broadcasts immediately after connect()
 * resolves may see the broadcast land before its own presence appears in remote
 * presence sync — tolerated since downstream layers do not gate on member-map.
 *
 * Post-connect channel errors (network drop, etc.) are currently console-warned
 * but not surfaced. PR2 will add onStatus listener when reconnect UX is built.
 */
export class RealtimeClient {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private eventListeners: EventListener[] = [];
  private presenceListeners: PresenceListener[] = [];
  private currentTrack: PresenceMeta | null = null;

  constructor() {
    if (!SUPABASE_URL) {
      throw new Error('SUPABASE_URL is empty — set it in .env.local before running');
    }
    if (!SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_ANON_KEY is empty — set it in .env.local before running');
    }
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }

  async connect(roomCode: string, presence: PresenceMeta): Promise<void> {
    if (this.channel) {
      throw new Error('Already connected — call disconnect() first');
    }
    const topic = `${CHANNEL_PREFIX}${roomCode}`;
    this.channel = this.supabase.channel(topic, {
      config: { presence: { key: presence.memberKey } },
    });

    this.channel.on('broadcast', { event: 'session-event' }, ({ payload }) => {
      for (const listener of this.eventListeners) {
        listener(payload as SessionEvent);
      }
    });

    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel!.presenceState<PresenceMeta>();
      const members: PresenceMeta[] = [];
      for (const arr of Object.values(state)) {
        if (arr.length === 0) continue;
        // Same memberKey from a re-connect produces multiple entries under the same
        // presence key — dedupe by picking the earliest joinedAt (oldest connection).
        const sorted = [...arr].sort((a, b) => a.joinedAt - b.joinedAt);
        const { presence_ref: _ref, ...meta } = sorted[0];
        members.push(meta as PresenceMeta);
      }
      for (const listener of this.presenceListeners) listener(members);
    });

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      this.channel!.subscribe((status) => {
        if (settled) {
          // Post-connect status changes (errors, reconnects) are silently dropped
          // for now. PR2 will add an onStatus listener when reconnect UX is built.
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[session-room] post-connect channel status:', status);
          }
          return;
        }
        if (status === 'SUBSCRIBED') {
          settled = true;
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          settled = true;
          reject(new Error(`Channel status: ${status}`));
        }
      });
    });

    this.currentTrack = presence;
    await this.channel.track(presence);
  }

  async updatePresence(patch: Partial<PresenceMeta>): Promise<void> {
    if (!this.channel || !this.currentTrack) return;
    this.currentTrack = { ...this.currentTrack, ...patch };
    await this.channel.track(this.currentTrack);
  }

  async broadcast(event: SessionEvent): Promise<void> {
    if (!this.channel) throw new Error('Not connected');
    await this.channel.send({
      type: 'broadcast',
      event: 'session-event',
      payload: event,
    });
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  onPresence(listener: PresenceListener): () => void {
    this.presenceListeners.push(listener);
    return () => {
      this.presenceListeners = this.presenceListeners.filter((l) => l !== listener);
    };
  }

  async disconnect(): Promise<void> {
    if (!this.channel) return;
    try {
      await this.channel.untrack();
    } catch (e) {
      console.warn('[session-room] untrack failed during disconnect', e);
    }
    await this.supabase.removeChannel(this.channel);
    this.channel = null;
    this.currentTrack = null;
    this.eventListeners = [];
    this.presenceListeners = [];
  }

  isConnected(): boolean {
    return this.channel !== null;
  }
}
