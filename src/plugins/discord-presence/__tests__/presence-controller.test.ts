import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PresenceController } from '../presence-controller.js';
import type { DiscordService } from '../discord-service.js';
import type { TimerManager } from '../timer-manager.js';
import type { PlayerStateUpdate, PresenceConfig } from '../types.js';

function makeServices() {
  const discord = {
    setActivity: vi.fn(),
    clearActivity: vi.fn(),
  } as unknown as DiscordService;
  const timerManager = {
    clear: vi.fn(),
    set: vi.fn(),
    clearAll: vi.fn(),
  } as unknown as TimerManager;
  return { discord, timerManager };
}

const config: PresenceConfig = {
  enabled: true,
  autoReconnect: true,
  activityTimeoutMinutes: 10,
  titleLanguage: 'uilang',
};

const baseSnapshot = (overrides: Partial<PlayerStateUpdate> = {}): PlayerStateUpdate => ({
  videoId: 'vid1',
  url: 'https://www.youtube.com/watch?v=vid1',
  paused: false,
  currentTime: 0,
  duration: 300,
  ended: false,
  uiLang: 'ko',
  domTitle: 'First Title',
  domChannel: 'First Channel',
  ...overrides,
});

describe('PresenceController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn(async () => ({ ok: false, status: 404, json: async () => null }) as Response);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('refreshes fallback title from live snapshot after DOM settles', async () => {
    const { discord, timerManager } = makeServices();
    const controller = new PresenceController(
      discord,
      timerManager,
      () => 'http://api',
      () => config,
    );

    // Initial dispatch with stale DOM title (captured during Mix transition).
    await controller.onPlayerStateUpdate(baseSnapshot({ domTitle: 'Stale Title', domChannel: 'Stale Chan' }));
    await vi.advanceTimersByTimeAsync(1500);
    await vi.runOnlyPendingTimersAsync();

    // First setActivity: stale title (fallback result cached).
    expect(discord.setActivity).toHaveBeenCalled();
    const firstActivity = (discord.setActivity as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(firstActivity.details).toBe('Stale Title');

    // DOM has since settled to the correct title — same videoId, progress tick.
    (discord.setActivity as ReturnType<typeof vi.fn>).mockClear();
    await controller.onPlayerStateUpdate(baseSnapshot({
      currentTime: 2,
      domTitle: 'Correct Title',
      domChannel: 'Correct Chan',
    }));

    // metaChanged trigger should push the refreshed title immediately.
    expect(discord.setActivity).toHaveBeenCalledTimes(1);
    const secondActivity = (discord.setActivity as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(secondActivity.details).toBe('Correct Title');
    expect(secondActivity.state).toBe('Correct Chan');
  });

  it('DB result keeps server title regardless of snapshot domTitle changes', async () => {
    const { discord, timerManager } = makeServices();
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          video: { platform: 'youtube', externalId: 'vid1' },
          recordings: [{
            id: 1,
            isOrigin: true,
            titles: [{ language: 'ko', title: 'DB Title', isMain: true }],
            artists: [{ artistId: 1, name: 'DB Artist', role: 'vocal', isPublic: true }],
            work: { id: 1, titles: [], creators: [] },
            isMainVideo: true,
          }],
        },
      }),
    }) as Response);

    const controller = new PresenceController(
      discord,
      timerManager,
      () => 'http://api',
      () => config,
    );

    await controller.onPlayerStateUpdate(baseSnapshot());
    await vi.advanceTimersByTimeAsync(1500);
    await vi.runOnlyPendingTimersAsync();

    const firstActivity = (discord.setActivity as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(firstActivity.details).toBe('DB Title');

    // Progress tick with different domTitle — DB title should NOT change.
    (discord.setActivity as ReturnType<typeof vi.fn>).mockClear();
    await controller.onPlayerStateUpdate(baseSnapshot({
      currentTime: 2,
      domTitle: 'Irrelevant Dom',
    }));

    // No meta change for DB (title stays 'DB Title'), and no other trigger → no setActivity.
    expect(discord.setActivity).not.toHaveBeenCalled();
  });

  it('metaChanged does not fire on videoChanged (covered by videoChanged trigger)', async () => {
    const { discord, timerManager } = makeServices();
    const controller = new PresenceController(
      discord,
      timerManager,
      () => 'http://api',
      () => config,
    );

    await controller.onPlayerStateUpdate(baseSnapshot({ domTitle: 'Title A' }));
    await vi.advanceTimersByTimeAsync(1500);
    await vi.runOnlyPendingTimersAsync();

    (discord.setActivity as ReturnType<typeof vi.fn>).mockClear();

    // New videoId — videoChanged path, not metaChanged path.
    await controller.onPlayerStateUpdate(baseSnapshot({ videoId: 'vid2', domTitle: 'Title B' }));
    await vi.advanceTimersByTimeAsync(1500);
    await vi.runOnlyPendingTimersAsync();

    expect(discord.setActivity).toHaveBeenCalled();
    const activity = (discord.setActivity as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0];
    expect(activity.details).toBe('Title B');
  });
});
