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
