import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomController } from './room-controller.js';
import { SessionStateStore } from './session-state.js';

class MockRealtime {
  connect = vi.fn();
  disconnect = vi.fn();
  broadcast = vi.fn();
  onEvent = vi.fn(() => () => {});
  onPresence = vi.fn(() => () => {});
  onStatus = vi.fn(() => () => {});
  updatePresence = vi.fn();
  isConnected = vi.fn(() => false);
}

describe('RoomController', () => {
  let store: SessionStateStore;
  let realtime: MockRealtime;
  let openWindow: ReturnType<typeof vi.fn>;
  let closeWindow: ReturnType<typeof vi.fn>;
  let ctrl: RoomController;

  beforeEach(() => {
    store = new SessionStateStore();
    realtime = new MockRealtime();
    openWindow = vi.fn();
    closeWindow = vi.fn();
    ctrl = new RoomController({
      store,
      realtime: realtime as unknown as import('./realtime-client.js').RealtimeClient,
      openSessionWindow: openWindow,
      closeSessionWindow: closeWindow,
    });
  });

  it('createSession generates code, connects, opens window', async () => {
    const r = await ctrl.createSession({ displayName: 'Dong', initialVideoId: null });
    expect(r.roomCode).toMatch(/^[0-9a-z]{6}$/);
    expect(realtime.connect).toHaveBeenCalledWith(r.roomCode, expect.objectContaining({ isHost: true }));
    expect(openWindow).toHaveBeenCalledWith(expect.objectContaining({ roomCode: r.roomCode }));
    expect(store.get().isHost).toBe(true);
  });

  it('joinSession connects, opens window, returns memberKey', async () => {
    const r = await ctrl.joinSession({ roomCode: 'k7m3xq', displayName: 'Sara' });
    expect(realtime.connect).toHaveBeenCalledWith('k7m3xq', expect.objectContaining({ displayName: 'Sara', isHost: false }));
    expect(openWindow).toHaveBeenCalled();
    expect(r.memberKey).toBeDefined();
    expect(store.get().isHost).toBe(false);
  });

  it('leaveSession disconnects, closes window, resets state', async () => {
    await ctrl.createSession({ displayName: 'Dong', initialVideoId: null });
    await ctrl.leaveSession();
    expect(realtime.disconnect).toHaveBeenCalled();
    expect(closeWindow).toHaveBeenCalled();
    expect(store.get().room).toBeNull();
  });

  it('joinSession rejects invalid code format', async () => {
    await expect(ctrl.joinSession({ roomCode: 'BADCODE', displayName: 'x' })).rejects.toThrow(/invalid/i);
  });
});
