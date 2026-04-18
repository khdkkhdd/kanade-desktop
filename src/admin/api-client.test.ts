import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAdminApiClient } from './api-client.js';

describe('createAdminApiClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('sends Authorization header to admin endpoint', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: 1 } }),
    });
    const client = createAdminApiClient({ apiBase: 'https://ex.test/api/v1', adminApiKey: 'abc' });
    await client.request('GET', '/admin/works/1');
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('https://ex.test/api/v1/admin/works/1');
    expect((init.headers as any)['Authorization']).toBe('Bearer abc');
  });

  it('returns ok=true with data on success', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: 1 } }),
    });
    const client = createAdminApiClient({ apiBase: 'https://ex.test/api/v1', adminApiKey: 'abc' });
    const r = await client.request('GET', '/admin/works/1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ id: 1 });
  });

  it('maps 401 to AUTH error code', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });
    const client = createAdminApiClient({ apiBase: 'https://ex.test/api/v1', adminApiKey: 'bad' });
    const r = await client.request('GET', '/admin/works/1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('AUTH');
  });

  it('maps 409 to DUPLICATE error code', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Duplicate entry' }),
    });
    const client = createAdminApiClient({ apiBase: 'https://ex.test/api/v1', adminApiKey: 'abc' });
    const r = await client.request('POST', '/admin/works', { titles: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DUPLICATE');
  });

  it('maps fetch rejection to NETWORK error', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const client = createAdminApiClient({ apiBase: 'https://ex.test/api/v1', adminApiKey: 'abc' });
    const r = await client.request('GET', '/admin/works/1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('NETWORK');
  });

  it('returns AUTH_MISSING when adminApiKey empty', async () => {
    const client = createAdminApiClient({ apiBase: 'https://ex.test/api/v1', adminApiKey: '' });
    const r = await client.request('GET', '/admin/works/1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('AUTH_MISSING');
    expect(fetch).not.toHaveBeenCalled();
  });
});
