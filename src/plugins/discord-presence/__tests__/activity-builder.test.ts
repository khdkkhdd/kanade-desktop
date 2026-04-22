import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildActivity } from '../activity-builder.js';
import type { SongInfo } from '../types.js';

const NOW = 1_700_000_000_000;

const baseSongInfo = (overrides: Partial<SongInfo> = {}): SongInfo => ({
  title: 'Title',
  artists: 'Artist',
  originUrl: null,
  thumbnailUrl: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
  videoUrl: 'https://www.youtube.com/watch?v=abc',
  videoId: 'abc',
  isPaused: false,
  elapsedSeconds: 30,
  durationSeconds: 180,
  isLive: false,
  isFallback: false,
  ...overrides,
});

describe('buildActivity', () => {
  beforeAll(() => { vi.spyOn(Date, 'now').mockReturnValue(NOW); });
  afterAll(() => { vi.restoreAllMocks(); });

  it('sets details to title and state to artists', () => {
    const a = buildActivity(baseSongInfo());
    expect(a.details).toBe('Title');
    expect(a.state).toBe('Artist');
  });

  it('sets detailsUrl to videoUrl so title text is clickable', () => {
    const a = buildActivity(baseSongInfo());
    expect(a.detailsUrl).toBe('https://www.youtube.com/watch?v=abc');
  });

  it('uses thumbnailUrl as largeImageKey', () => {
    const a = buildActivity(baseSongInfo());
    expect(a.largeImageKey).toBe('https://i.ytimg.com/vi/abc/hqdefault.jpg');
  });

  it('computes startTimestamp and endTimestamp for playing', () => {
    const a = buildActivity(baseSongInfo({ elapsedSeconds: 30, durationSeconds: 180 }));
    const start = Math.floor((NOW - 30_000) / 1000);
    expect(a.startTimestamp).toBe(start);
    expect(a.endTimestamp).toBe(start + 180);
  });

  it('omits timestamps when paused', () => {
    const a = buildActivity(baseSongInfo({ isPaused: true }));
    expect(a.startTimestamp).toBeUndefined();
    expect(a.endTimestamp).toBeUndefined();
    expect(a.largeImageText).toBe('⏸\uFE0E');
  });

  it('omits timestamps for live streams (Infinity duration)', () => {
    const a = buildActivity(baseSongInfo({ durationSeconds: Infinity }));
    expect(a.startTimestamp).toBeUndefined();
    expect(a.endTimestamp).toBeUndefined();
  });

  it('omits timestamps for live streams with finite DVR duration', () => {
    const a = buildActivity(baseSongInfo({ isLive: true, durationSeconds: 3600 }));
    expect(a.startTimestamp).toBeUndefined();
    expect(a.endTimestamp).toBeUndefined();
  });

  it('includes 1 button (YouTube) for origin recording', () => {
    const a = buildActivity(baseSongInfo({ originUrl: null }));
    expect(a.buttons).toEqual([
      { label: 'YouTube에서 보기', url: 'https://www.youtube.com/watch?v=abc' },
    ]);
  });

  it('includes 2 buttons for cover recording with origin', () => {
    const a = buildActivity(baseSongInfo({
      originUrl: 'https://www.youtube.com/watch?v=origin',
    }));
    expect(a.buttons).toEqual([
      { label: 'YouTube에서 보기', url: 'https://www.youtube.com/watch?v=abc' },
      { label: '원곡 듣기', url: 'https://www.youtube.com/watch?v=origin' },
    ]);
  });

  it('includes 1 button for fallback kind', () => {
    const a = buildActivity(baseSongInfo({ isFallback: true }));
    expect(a.buttons).toHaveLength(1);
  });

  it('pads short (1-char) title/artists', () => {
    const a = buildActivity(baseSongInfo({ title: '하', artists: '나' }));
    expect(a.details).toBe('하\u3164');
    expect(a.state).toBe('나\u3164');
  });
});
