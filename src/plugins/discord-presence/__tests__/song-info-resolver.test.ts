import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveSongInfo } from '../song-info-resolver.js';
import type { PlayerStateUpdate } from '../types.js';

const snapshotBase = (overrides: Partial<PlayerStateUpdate> = {}): PlayerStateUpdate => ({
  videoId: 'abc123',
  url: 'https://www.youtube.com/watch?v=abc123',
  paused: false,
  currentTime: 45,
  duration: 300,
  ended: false,
  uiLang: 'ko',
  domTitle: 'DOM Title',
  domChannel: 'DOM Channel',
  ...overrides,
});

const apiBase = 'http://localhost:3000/api/v1';

function mockFetchResponses(responses: Record<string, unknown>) {
  global.fetch = vi.fn(async (url) => {
    const path = url.toString().replace(apiBase, '');
    const body = responses[path];
    if (body === undefined) return { ok: false, status: 404, json: async () => null } as Response;
    return { ok: true, status: 200, json: async () => body } as Response;
  });
}

describe('resolveSongInfo', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns db result for single-recording DB-registered video (origin)', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            id: 10,
            isOrigin: true,
            titles: [{ language: 'ko', title: '한국어제목', isMain: false }, { language: 'ja', title: 'JA', isMain: true }],
            artists: [{ artistId: 1, name: '傘村トータ', role: 'vocal', isPublic: true }],
            work: {
              id: 100,
              titles: [{ language: 'ja', title: 'Work', isMain: true }],
              creators: [{ artistId: 1, name: '傘村トータ', role: 'composer', isPublic: true }],
            },
            isMainVideo: true,
          }],
        },
      },
    });

    const result = await resolveSongInfo(snapshotBase(), apiBase);

    expect(result.kind).toBe('db');
    expect(result.title).toBe('한국어제목');
    expect(result.artists).toBe('傘村トータ');
    expect(result.originUrl).toBeNull();
    expect(result.thumbnailUrl).toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg');
    expect(result.videoUrl).toBe('https://www.youtube.com/watch?v=abc123');
  });

  it('fetches origin main video URL for cover recording', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            id: 11,
            isOrigin: false,
            titles: [{ language: 'ja', title: 'Cover', isMain: true }],
            artists: [{ artistId: 2, name: 'あるふぁきゅん。', role: 'vocal', isPublic: true }],
            work: {
              id: 100,
              titles: [{ language: 'ja', title: 'Work', isMain: true }],
              creators: [{ artistId: 1, name: '傘村トータ', role: 'composer', isPublic: true }],
            },
            isMainVideo: false,
          }],
        },
      },
      '/public/works/100/recordings?isOrigin=true&limit=1&lang=ko': {
        data: [{
          id: 10,
          isOrigin: true,
          title: 'Origin',
          workTitle: 'Work',
          artists: [],
          workCreators: [],
          mainVideo: { platform: 'youtube', externalId: 'origin_vid' },
        }],
        seed: 0,
        nextOffset: null,
      },
    });

    const result = await resolveSongInfo(snapshotBase(), apiBase);

    expect(result.kind).toBe('db');
    expect(result.originUrl).toBe('https://www.youtube.com/watch?v=origin_vid');
  });

  it('falls back when recordings.length === 0', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: { video: { platform: 'youtube', externalId: 'abc123' }, recordings: [] },
      },
    });

    const result = await resolveSongInfo(snapshotBase(), apiBase);
    expect(result.kind).toBe('fallback');
    expect(result.title).toBe('DOM Title');
    expect(result.artists).toBe('DOM Channel');
  });

  it('falls back when recordings.length > 1 (medley)', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [
            { id: 1, isOrigin: true, titles: [{ language: 'ja', title: 'A', isMain: true }], artists: [], work: { id: 1, titles: [], creators: [] }, isMainVideo: false },
            { id: 2, isOrigin: true, titles: [{ language: 'ja', title: 'B', isMain: true }], artists: [], work: { id: 2, titles: [], creators: [] }, isMainVideo: false },
          ],
        },
      },
    });

    const result = await resolveSongInfo(snapshotBase(), apiBase);
    expect(result.kind).toBe('fallback');
  });

  it('falls back when no public artists (strict)', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            id: 10,
            isOrigin: true,
            titles: [{ language: 'ja', title: 'T', isMain: true }],
            artists: [{ artistId: 1, name: 'Hidden', role: null, isPublic: false }],
            work: { id: 1, titles: [], creators: [] },
            isMainVideo: false,
          }],
        },
      },
    });

    const result = await resolveSongInfo(snapshotBase(), apiBase);
    expect(result.kind).toBe('fallback');
  });

  it('falls back on HTTP 404', async () => {
    mockFetchResponses({});
    const result = await resolveSongInfo(snapshotBase(), apiBase);
    expect(result.kind).toBe('fallback');
  });

  it('falls back on fetch reject', async () => {
    global.fetch = vi.fn(async () => { throw new Error('network'); });
    const result = await resolveSongInfo(snapshotBase(), apiBase);
    expect(result.kind).toBe('fallback');
  });

  it('fallback uses "YouTube" when DOM values empty', async () => {
    mockFetchResponses({});
    const result = await resolveSongInfo(
      snapshotBase({ domTitle: '', domChannel: null }),
      apiBase,
    );
    expect(result.title).toBe('YouTube');
    expect(result.artists).toBe('YouTube');
  });

  it('dedupes recording+work artist when same artistId', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            id: 10,
            isOrigin: true,
            titles: [{ language: 'ja', title: 'T', isMain: true }],
            artists: [{ artistId: 1, name: 'SameArtist', role: 'vocal', isPublic: true }],
            work: {
              id: 100,
              titles: [],
              creators: [{ artistId: 1, name: 'SameArtist', role: 'composer', isPublic: true }],
            },
            isMainVideo: true,
          }],
        },
      },
    });

    const result = await resolveSongInfo(snapshotBase(), apiBase);
    expect(result.artists).toBe('SameArtist');
  });

  it('joins multiple artists with comma', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            id: 10,
            isOrigin: true,
            titles: [{ language: 'ja', title: 'T', isMain: true }],
            artists: [
              { artistId: 1, name: 'A', role: 'vocal', isPublic: true },
              { artistId: 2, name: 'B', role: 'vocal', isPublic: true },
            ],
            work: { id: 100, titles: [], creators: [] },
            isMainVideo: true,
          }],
        },
      },
    });

    const result = await resolveSongInfo(snapshotBase(), apiBase);
    expect(result.artists).toBe('A, B');
  });

  it('origin fetch failure → cover still returns db result with null originUrl', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            id: 11,
            isOrigin: false,
            titles: [{ language: 'ja', title: 'Cover', isMain: true }],
            artists: [{ artistId: 2, name: 'X', role: 'vocal', isPublic: true }],
            work: { id: 100, titles: [], creators: [] },
            isMainVideo: false,
          }],
        },
      },
    });

    const result = await resolveSongInfo(snapshotBase(), apiBase);
    expect(result.kind).toBe('db');
    expect(result.originUrl).toBeNull();
  });
});
