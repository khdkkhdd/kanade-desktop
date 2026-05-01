import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { SessionEvent, PresenceMeta } from '../shared/types.js';
import { CHANNEL_PREFIX } from '../shared/constants.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../shared/supabase-env.js';

type EventListener = (event: SessionEvent) => void;
type PresenceListener = (members: PresenceMeta[]) => void;

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
      const state = this.channel!.presenceState() as Record<string, PresenceMeta[]>;
      const members: PresenceMeta[] = [];
      for (const arr of Object.values(state)) {
        if (arr.length > 0) members.push(arr[0]);
      }
      for (const listener of this.presenceListeners) listener(members);
    });

    await new Promise<void>((resolve, reject) => {
      this.channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(`Channel status: ${status}`));
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
    } catch {
      /* ignore */
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
