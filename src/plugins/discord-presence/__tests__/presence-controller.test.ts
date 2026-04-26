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
  isLive: false,
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
            publicId: 'rc_aaaaaaaaa',
            isOrigin: true,
            titles: [{ language: 'ko', title: 'DB Title', isMain: true }],
            artists: [{ artistPublicId: 'ar_aaaaaaaaa', name: 'DB Artist', role: 'vocal', isPublic: true }],
            work: { publicId: 'wk_aaaaaaaaa', titles: [], creators: [] },
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

  it('invalidate(videoId) clears cache and re-resolves when current', async () => {
    const { discord, timerManager } = makeServices();

    // First fetch returns fallback (404) — second fetch returns DB result.
    let callCount = 0;
    global.fetch = vi.fn(async () => {
      callCount += 1;
      if (callCount === 1) {
        return { ok: false, status: 404, json: async () => null } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            video: { platform: 'youtube', externalId: 'vid1' },
            recordings: [{
              publicId: 'rc_aaaaaaaaa',
              isOrigin: true,
              titles: [{ language: 'ko', title: 'Fresh DB Title', isMain: true }],
              artists: [{ artistPublicId: 'ar_aaaaaaaaa', name: 'Fresh DB Artist', role: 'vocal', isPublic: true }],
              work: { publicId: 'wk_aaaaaaaaa', titles: [], creators: [] },
              isMainVideo: true,
            }],
          },
        }),
      } as Response;
    });

    const controller = new PresenceController(
      discord,
      timerManager,
      () => 'http://api',
      () => config,
    );

    // Initial play — first resolve hits the 404, caches the fallback.
    await controller.onPlayerStateUpdate(baseSnapshot({ domTitle: 'Fallback Title', domChannel: 'Fallback Chan' }));
    await vi.advanceTimersByTimeAsync(1500);
    await vi.runOnlyPendingTimersAsync();

    expect(discord.setActivity).toHaveBeenCalled();
    const firstActivity = (discord.setActivity as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(firstActivity.details).toBe('Fallback Title');
    expect(callCount).toBe(1);

    // Admin-video registered the video in DB → invalidate the cache.
    (discord.setActivity as ReturnType<typeof vi.fn>).mockClear();
    controller.invalidate('vid1');

    // Re-resolve runs immediately (no settle delay because videoId didn't change).
    await vi.runOnlyPendingTimersAsync();

    expect(callCount).toBe(2);
    expect(discord.setActivity).toHaveBeenCalled();
    const refreshedActivity = (discord.setActivity as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0];
    expect(refreshedActivity.details).toBe('Fresh DB Title');
  });

  it('invalidate(videoId) for non-current video only drops cache', async () => {
    const { discord, timerManager } = makeServices();
    const controller = new PresenceController(
      discord,
      timerManager,
      () => 'http://api',
      () => config,
    );

    await controller.onPlayerStateUpdate(baseSnapshot({ videoId: 'vid1' }));
    await vi.advanceTimersByTimeAsync(1500);
    await vi.runOnlyPendingTimersAsync();

    const fetchCallsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    (discord.setActivity as ReturnType<typeof vi.fn>).mockClear();

    // Invalidating a different videoId should not trigger any re-fetch.
    controller.invalidate('vid-other');
    await vi.runOnlyPendingTimersAsync();

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCallsBefore);
    expect(discord.setActivity).not.toHaveBeenCalled();
  });

  it('invalidateAll() clears cache and re-resolves current video with fresh lastSnapshot', async () => {
    const { discord, timerManager } = makeServices();

    // First fetch (uiLang=ko) returns the ko title; second fetch (uiLang=en
    // after locale change) returns the en title. Same videoId — proves the
    // re-resolve actually re-fetches with the updated lang.
    let callCount = 0;
    global.fetch = vi.fn(async (url: string) => {
      callCount += 1;
      const isKo = url.includes('lang=ko');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            video: { platform: 'youtube', externalId: 'vid1' },
            recordings: [{
              publicId: 'rc_aaaaaaaaa',
              isOrigin: true,
              titles: [{ language: isKo ? 'ko' : 'en', title: isKo ? 'KO Title' : 'EN Title', isMain: true }],
              artists: [{ artistPublicId: 'ar_aaaaaaaaa', name: isKo ? 'KO Artist' : 'EN Artist', role: 'vocal', isPublic: true }],
              work: { publicId: 'wk_aaaaaaaaa', titles: [], creators: [] },
              isMainVideo: true,
            }],
          },
        }),
      } as Response;
    }) as unknown as typeof fetch;

    const controller = new PresenceController(
      discord,
      timerManager,
      () => 'http://api',
      () => config,
    );

    // Initial play with uiLang=ko — caches the ko-resolved entry.
    await controller.onPlayerStateUpdate(baseSnapshot({ uiLang: 'ko' }));
    await vi.advanceTimersByTimeAsync(1500);
    await vi.runOnlyPendingTimersAsync();

    expect(callCount).toBe(1);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('lang=ko');
    const firstActivity = (discord.setActivity as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(firstActivity.details).toBe('KO Title');

    // Renderer's i18n:locale-changed handler dispatches a fresh snapshot first,
    // updating lastSnapshot.uiLang → 'en'. Same videoId, so this hits the cache
    // path and would NOT re-fetch on its own.
    (discord.setActivity as ReturnType<typeof vi.fn>).mockClear();
    await controller.onPlayerStateUpdate(baseSnapshot({ uiLang: 'en', currentTime: 1 }));

    // Cache hit: still showing the stale ko title at this point.
    expect(callCount).toBe(1);

    // Now the invalidate-all-presence IPC arrives → wipe cache + re-resolve.
    controller.invalidateAll();
    await vi.runOnlyPendingTimersAsync();

    // Second fetch fired, this time with the new uiLang.
    expect(callCount).toBe(2);
    const secondFetchUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][0];
    expect(secondFetchUrl).toContain('lang=en');

    // Activity reflects the en-resolved title.
    expect(discord.setActivity).toHaveBeenCalled();
    const refreshedActivity = (discord.setActivity as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0];
    expect(refreshedActivity.details).toBe('EN Title');
  });

  it('invalidateAll() with no current video is a no-op', async () => {
    const { discord, timerManager } = makeServices();
    const controller = new PresenceController(
      discord,
      timerManager,
      () => 'http://api',
      () => config,
    );

    const fetchSpy = global.fetch as ReturnType<typeof vi.fn>;
    const callsBefore = fetchSpy.mock.calls.length;

    controller.invalidateAll();
    await vi.runOnlyPendingTimersAsync();

    expect(fetchSpy.mock.calls.length).toBe(callsBefore);
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
