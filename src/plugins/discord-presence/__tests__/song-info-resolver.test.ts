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
  isLive: false,
  ...overrides,
});

const apiBase = 'http://localhost:3000/api/v1';

// 12-char nanoid-shaped placeholders (matches the server-side validator).
const PID = {
  work100: 'wk_aaaaaaaaa',
  work200: 'wk_bbbbbbbbb',
  rec10:   'rc_aaaaaaaaa',
  rec11:   'rc_bbbbbbbbb',
  rec1:    'rc_ccccccccc',
  rec2:    'rc_ddddddddd',
  artist1: 'ar_aaaaaaaaa',
  artist2: 'ar_bbbbbbbbb',
};

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
            publicId: PID.rec10,
            isOrigin: true,
            titles: [{ language: 'ko', title: '한국어제목', isMain: false }, { language: 'ja', title: 'JA', isMain: true }],
            artists: [{ artistPublicId: PID.artist1, name: '傘村トータ', role: 'vocal', isPublic: true }],
            work: {
              publicId: PID.work100,
              titles: [{ language: 'ja', title: 'Work', isMain: true }],
              creators: [{ artistPublicId: PID.artist1, name: '傘村トータ', role: 'composer', isPublic: true }],
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
            publicId: PID.rec11,
            isOrigin: false,
            titles: [{ language: 'ja', title: 'Cover', isMain: true }],
            artists: [{ artistPublicId: PID.artist2, name: 'あるふぁきゅん。', role: 'vocal', isPublic: true }],
            work: {
              publicId: PID.work100,
              titles: [{ language: 'ja', title: 'Work', isMain: true }],
              creators: [{ artistPublicId: PID.artist1, name: '傘村トータ', role: 'composer', isPublic: true }],
            },
            isMainVideo: false,
          }],
        },
      },
      [`/public/works/${PID.work100}/recordings?isOrigin=true&limit=1&lang=ko`]: {
        data: [{
          publicId: PID.rec10,
          isOrigin: true,
          title: 'Origin',
          workTitle: 'Work',
          workPublicId: PID.work100,
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

  it('omits work creators from artists on a cover recording', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            publicId: PID.rec11,
            isOrigin: false,
            titles: [{ language: 'ja', title: 'Cover', isMain: true }],
            artists: [{ artistPublicId: PID.artist2, name: 'あるふぁきゅん。', role: 'vocal', isPublic: true }],
            work: {
              publicId: PID.work100,
              titles: [{ language: 'ja', title: 'Work', isMain: true }],
              creators: [{ artistPublicId: PID.artist1, name: '傘村トータ', role: 'composer', isPublic: true }],
            },
            isMainVideo: false,
          }],
        },
      },
      [`/public/works/${PID.work100}/recordings?isOrigin=true&limit=1&lang=ko`]: {
        data: [], seed: 0, nextOffset: null,
      },
    });

    const result = await resolveSongInfo(snapshotBase(), apiBase);

    expect(result.kind).toBe('db');
    expect(result.artists).toBe('あるふぁきゅん。');
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
            { publicId: PID.rec1, isOrigin: true, titles: [{ language: 'ja', title: 'A', isMain: true }], artists: [], work: { publicId: PID.work100, titles: [], creators: [] }, isMainVideo: false },
            { publicId: PID.rec2, isOrigin: true, titles: [{ language: 'ja', title: 'B', isMain: true }], artists: [], work: { publicId: PID.work200, titles: [], creators: [] }, isMainVideo: false },
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
            publicId: PID.rec10,
            isOrigin: true,
            titles: [{ language: 'ja', title: 'T', isMain: true }],
            artists: [{ artistPublicId: PID.artist1, name: 'Hidden', role: null, isPublic: false }],
            work: { publicId: PID.work100, titles: [], creators: [] },
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

  it('dedupes recording+work artist when same artistPublicId', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            publicId: PID.rec10,
            isOrigin: true,
            titles: [{ language: 'ja', title: 'T', isMain: true }],
            artists: [{ artistPublicId: PID.artist1, name: 'SameArtist', role: 'vocal', isPublic: true }],
            work: {
              publicId: PID.work100,
              titles: [],
              creators: [{ artistPublicId: PID.artist1, name: 'SameArtist', role: 'composer', isPublic: true }],
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
            publicId: PID.rec10,
            isOrigin: true,
            titles: [{ language: 'ja', title: 'T', isMain: true }],
            artists: [
              { artistPublicId: PID.artist1, name: 'A', role: 'vocal', isPublic: true },
              { artistPublicId: PID.artist2, name: 'B', role: 'vocal', isPublic: true },
            ],
            work: { publicId: PID.work100, titles: [], creators: [] },
            isMainVideo: true,
          }],
        },
      },
    });

    const result = await resolveSongInfo(snapshotBase(), apiBase);
    expect(result.artists).toBe('A, B');
  });

  it('falls back to work.titles when recording.titles is empty', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            publicId: PID.rec10,
            isOrigin: true,
            titles: [],
            artists: [{ artistPublicId: PID.artist1, name: '初音ミク', role: 'vocal', isPublic: true }],
            work: {
              publicId: PID.work100,
              titles: [
                { language: 'en', title: 'Monitoring', isMain: false },
                { language: 'ja', title: 'モニタリング', isMain: true },
                { language: 'ko', title: '모니터링', isMain: false },
              ],
              creators: [{ artistPublicId: PID.artist2, name: 'DECO*27', role: 'composer', isPublic: true }],
            },
            isMainVideo: true,
          }],
        },
      },
    });

    const result = await resolveSongInfo(snapshotBase({ uiLang: 'ko' }), apiBase);
    expect(result.kind).toBe('db');
    expect(result.title).toBe('모니터링');
  });

  it('work.titles lang mismatch → uses isMain', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko-KR': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            publicId: PID.rec10,
            isOrigin: true,
            titles: [],
            artists: [{ artistPublicId: PID.artist1, name: 'A', role: 'vocal', isPublic: true }],
            work: {
              publicId: PID.work100,
              titles: [
                { language: 'en', title: 'Monitoring', isMain: false },
                { language: 'ja', title: 'モニタリング', isMain: true },
              ],
              creators: [],
            },
            isMainVideo: true,
          }],
        },
      },
    });

    const result = await resolveSongInfo(snapshotBase({ uiLang: 'ko-KR' }), apiBase);
    expect(result.kind).toBe('db');
    expect(result.title).toBe('モニタリング');
  });

  it('recording.titles takes precedence over work.titles when both present', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            publicId: PID.rec10,
            isOrigin: false,
            titles: [{ language: 'ko', title: 'Cover한국어', isMain: true }],
            artists: [{ artistPublicId: PID.artist1, name: 'A', role: 'vocal', isPublic: true }],
            work: {
              publicId: PID.work100,
              titles: [{ language: 'ko', title: 'Work한국어', isMain: true }],
              creators: [],
            },
            isMainVideo: false,
          }],
        },
      },
      [`/public/works/${PID.work100}/recordings?isOrigin=true&limit=1&lang=ko`]: {
        data: [],
        seed: 0,
        nextOffset: null,
      },
    });

    const result = await resolveSongInfo(snapshotBase(), apiBase);
    expect(result.title).toBe('Cover한국어');
  });

  it("titleLanguage='main' picks isMain over UI lang", async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            publicId: PID.rec10,
            isOrigin: true,
            titles: [],
            artists: [{ artistPublicId: PID.artist1, name: 'A', role: 'vocal', isPublic: true }],
            work: {
              publicId: PID.work100,
              titles: [
                { language: 'ja', title: 'モニタリング', isMain: true },
                { language: 'ko', title: '모니터링', isMain: false },
              ],
              creators: [],
            },
            isMainVideo: true,
          }],
        },
      },
    });

    const result = await resolveSongInfo(snapshotBase({ uiLang: 'ko' }), apiBase, 'main');
    expect(result.title).toBe('モニタリング');
  });

  it("titleLanguage='main' still uses recording.titles when present", async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            publicId: PID.rec10,
            isOrigin: true,
            titles: [{ language: 'en', title: 'CoverEN', isMain: true }],
            artists: [{ artistPublicId: PID.artist1, name: 'A', role: 'vocal', isPublic: true }],
            work: {
              publicId: PID.work100,
              titles: [{ language: 'ja', title: 'Work JA', isMain: true }],
              creators: [],
            },
            isMainVideo: true,
          }],
        },
      },
    });

    const result = await resolveSongInfo(snapshotBase(), apiBase, 'main');
    expect(result.title).toBe('CoverEN');
  });

  it('origin fetch failure → cover still returns db result with null originUrl', async () => {
    mockFetchResponses({
      '/public/videos/youtube/abc123?lang=ko': {
        data: {
          video: { platform: 'youtube', externalId: 'abc123' },
          recordings: [{
            publicId: PID.rec11,
            isOrigin: false,
            titles: [{ language: 'ja', title: 'Cover', isMain: true }],
            artists: [{ artistPublicId: PID.artist2, name: 'X', role: 'vocal', isPublic: true }],
            work: { publicId: PID.work100, titles: [], creators: [] },
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
