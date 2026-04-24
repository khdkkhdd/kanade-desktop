import { describe, it, expect, vi } from 'vitest';
import { performRegister } from './register.js';
import type { AdminApiClient } from '../../admin/api-client.js';

function mockClient(responses: Array<{ ok: true; data: any } | { ok: false; error: any }>): AdminApiClient {
  const calls: any[] = [];
  let i = 0;
  return {
    request: vi.fn(async (method, path, body) => {
      calls.push({ method, path, body });
      return responses[i++] ?? { ok: true, data: {} };
    }),
    __calls: calls,
  } as any;
}

describe('performRegister', () => {
  it('creates new work then recording with video link', async () => {
    const client = mockClient([
      { ok: true, data: { id: 100 } },
      { ok: true, data: { id: 500 } },
    ]);
    const r = await performRegister(client, {
      videoId: 'abc',
      work: {
        kind: 'new',
        titles: [{ title: 'T', language: 'ja', isMain: true }],
        artists: [],
      },
      recording: {
        kind: 'new',
        isOrigin: true,
        titles: [],
        artists: [{ artistId: 7, role: 'vocal', isPublic: true }],
      },
      isMainVideo: true,
    });
    expect(r.ok).toBe(true);
    const calls = (client as any).__calls;
    expect(calls[0].path).toBe('/admin/works');
    expect(calls[1].path).toBe('/admin/recordings');
    expect(calls[1].body.workId).toBe(100);
    expect(calls[1].body.videos[0]).toEqual({ platform: 'youtube', externalId: 'abc', isMain: true });
  });

  it('uses existing work and links video to existing recording', async () => {
    const client = mockClient([
      { ok: true, data: { recordingId: 500, externalVideoId: 99, isMain: false } },
    ]);
    const r = await performRegister(client, {
      videoId: 'abc',
      work: { kind: 'existing', id: 100 },
      recording: { kind: 'existing', id: 500 },
      isMainVideo: false,
    });
    expect(r.ok).toBe(true);
    const calls = (client as any).__calls;
    expect(calls.length).toBe(1);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].path).toBe('/admin/recordings/500/videos');
    expect(calls[0].body).toEqual({ platform: 'youtube', externalId: 'abc', isMain: false });
  });

  it('creates new artists before recording', async () => {
    const client = mockClient([
      { ok: true, data: { id: 201 } },
      { ok: true, data: { id: 500 } },
    ]);
    const r = await performRegister(client, {
      videoId: 'abc',
      work: { kind: 'existing', id: 100 },
      recording: {
        kind: 'new',
        isOrigin: false,
        titles: [],
        artists: [
          { newArtist: { type: 'solo', names: [{ name: 'Ado', language: 'ja', isMain: true }] }, role: 'vocal', isPublic: true },
        ],
      },
      isMainVideo: true,
    });
    expect(r.ok).toBe(true);
    const calls = (client as any).__calls;
    expect(calls[0].path).toBe('/admin/artists');
    expect(calls[0].body.names[0].name).toBe('Ado');
    expect(calls[1].body.artists[0].artistId).toBe(201);
  });

  it('dedupes new artists across work and recording by tempId (one POST /admin/artists, same id in both)', async () => {
    // Mock responses (order of calls):
    //  1. POST /admin/artists (shared tempId "t1") → id 42
    //  2. POST /admin/works                         → id 100
    //  3. POST /admin/works/100/artists             → ok
    //  4. POST /admin/recordings                    → id 500
    const client = mockClient([
      { ok: true, data: { id: 42 } },
      { ok: true, data: { id: 100 } },
      { ok: true, data: {} },
      { ok: true, data: { id: 500 } },
    ]);
    const sharedNew = { type: 'solo' as const, names: [{ name: 'Shared', language: 'ja', isMain: true }] };
    const r = await performRegister(client, {
      videoId: 'abc',
      work: {
        kind: 'new',
        titles: [{ title: 'T', language: 'ja', isMain: true }],
        artists: [{ newArtist: sharedNew, role: 'composer', isPublic: true, tempId: 't1' }],
      },
      recording: {
        kind: 'new',
        isOrigin: true,
        titles: [],
        artists: [{ newArtist: sharedNew, role: 'vocal', isPublic: true, tempId: 't1' }],
      },
      isMainVideo: true,
    });
    expect(r.ok).toBe(true);
    const calls = (client as any).__calls;
    // /admin/artists should be hit exactly once despite tempId appearing in both sections
    const artistCalls = calls.filter((c: any) => c.path === '/admin/artists');
    expect(artistCalls).toHaveLength(1);
    // Work credit and recording credit must both use id 42
    const workArtistCall = calls.find((c: any) => c.path === '/admin/works/100/artists');
    expect(workArtistCall.body.artistId).toBe(42);
    const recordingCall = calls.find((c: any) => c.path === '/admin/recordings');
    expect(recordingCall.body.artists[0].artistId).toBe(42);
  });

  it('does not dedupe when tempIds differ (creates separate artists)', async () => {
    const client = mockClient([
      { ok: true, data: { id: 10 } },
      { ok: true, data: { id: 100 } },
      { ok: true, data: {} },
      { ok: true, data: { id: 20 } },
      { ok: true, data: { id: 500 } },
    ]);
    const r = await performRegister(client, {
      videoId: 'abc',
      work: {
        kind: 'new',
        titles: [{ title: 'T', language: 'ja', isMain: true }],
        artists: [{ newArtist: { type: 'solo', names: [{ name: 'A', language: 'ja', isMain: true }] }, role: 'composer', isPublic: true, tempId: 't1' }],
      },
      recording: {
        kind: 'new',
        isOrigin: true,
        titles: [],
        artists: [{ newArtist: { type: 'solo', names: [{ name: 'B', language: 'ja', isMain: true }] }, role: 'vocal', isPublic: true, tempId: 't2' }],
      },
      isMainVideo: true,
    });
    expect(r.ok).toBe(true);
    const artistCalls = (client as any).__calls.filter((c: any) => c.path === '/admin/artists');
    expect(artistCalls).toHaveLength(2);
  });

  it('preserves legacy behavior when tempId is absent (creates fresh artist for each new entry)', async () => {
    const client = mockClient([
      { ok: true, data: { id: 11 } },
      { ok: true, data: { id: 100 } },
      { ok: true, data: {} },
      { ok: true, data: { id: 12 } },
      { ok: true, data: { id: 500 } },
    ]);
    const sharedNew = { type: 'solo' as const, names: [{ name: 'Dup', language: 'ja', isMain: true }] };
    const r = await performRegister(client, {
      videoId: 'abc',
      work: {
        kind: 'new',
        titles: [{ title: 'T', language: 'ja', isMain: true }],
        artists: [{ newArtist: sharedNew, role: 'composer', isPublic: true }],
      },
      recording: {
        kind: 'new',
        isOrigin: true,
        titles: [],
        artists: [{ newArtist: sharedNew, role: 'vocal', isPublic: true }],
      },
      isMainVideo: true,
    });
    expect(r.ok).toBe(true);
    // No tempId -> legacy behavior -> two POST /admin/artists
    const artistCalls = (client as any).__calls.filter((c: any) => c.path === '/admin/artists');
    expect(artistCalls).toHaveLength(2);
  });

  it('stops and returns error on first failure', async () => {
    const client = mockClient([
      { ok: false, error: { code: 'VALIDATION', message: 'bad' } },
    ]);
    const r = await performRegister(client, {
      videoId: 'abc',
      work: { kind: 'new', titles: [{ title: 'T', language: 'ja', isMain: true }], artists: [] },
      recording: { kind: 'existing', id: 1 },
      isMainVideo: true,
    });
    expect(r.ok).toBe(false);
  });
});
