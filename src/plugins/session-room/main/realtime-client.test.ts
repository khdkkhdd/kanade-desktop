import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealtimeClient } from './realtime-client.js';

const mockSend = vi.fn();
const mockUnsubscribe = vi.fn();
const mockTrack = vi.fn();
const mockUntrack = vi.fn();
const mockSubscribe = vi.fn((cb: (status: string) => void) => {
  setTimeout(() => cb('SUBSCRIBED'), 0);
  return { unsubscribe: mockUnsubscribe };
});

const mockChannel = {
  on: vi.fn(() => mockChannel),
  subscribe: mockSubscribe,
  send: mockSend,
  track: mockTrack,
  untrack: mockUntrack,
  unsubscribe: mockUnsubscribe,
  presenceState: vi.fn(() => ({})),
};

const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

vi.mock('../shared/supabase-env.js', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RealtimeClient', () => {
  it('connect creates a channel with correct topic', async () => {
    const c = new RealtimeClient();
    await c.connect('k7m3xq', { memberKey: 'me', displayName: 'n', joinedAt: 0, isHost: true });
    expect(mockSupabase.channel).toHaveBeenCalledWith(
      'kanade:room:k7m3xq',
      expect.objectContaining({ config: expect.any(Object) }),
    );
  });

  it('connect tracks presence after subscribe', async () => {
    const c = new RealtimeClient();
    await c.connect('k7m3xq', { memberKey: 'me', displayName: 'n', joinedAt: 100, isHost: false });
    expect(mockTrack).toHaveBeenCalledWith({ memberKey: 'me', displayName: 'n', joinedAt: 100, isHost: false });
  });

  it('broadcast sends event payload', async () => {
    const c = new RealtimeClient();
    await c.connect('x', { memberKey: 'me', displayName: 'n', joinedAt: 0, isHost: true });
    await c.broadcast({ type: 'CHAT', payload: { id: '1', text: 'hi', from: { memberKey: 'me', displayName: 'n' }, ts: 0 } });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ type: 'broadcast', event: 'session-event' }));
  });

  it('disconnect untracks and removes channel', async () => {
    const c = new RealtimeClient();
    await c.connect('x', { memberKey: 'me', displayName: 'n', joinedAt: 0, isHost: true });
    await c.disconnect();
    expect(mockUntrack).toHaveBeenCalled();
    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });
});

describe('RealtimeClient — env validation', () => {
  it('throws clear error when SUPABASE_URL is empty', async () => {
    vi.resetModules();
    vi.doMock('../shared/supabase-env.js', () => ({
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: 'test-anon-key',
    }));
    const { RealtimeClient: RC } = await import('./realtime-client.js');
    expect(() => new RC()).toThrow(/SUPABASE_URL/);
    vi.doUnmock('../shared/supabase-env.js');
    vi.resetModules();
  });

  it('throws clear error when SUPABASE_ANON_KEY is empty', async () => {
    vi.resetModules();
    vi.doMock('../shared/supabase-env.js', () => ({
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: '',
    }));
    const { RealtimeClient: RC } = await import('./realtime-client.js');
    expect(() => new RC()).toThrow(/SUPABASE_ANON_KEY/);
    vi.doUnmock('../shared/supabase-env.js');
    vi.resetModules();
  });
});
