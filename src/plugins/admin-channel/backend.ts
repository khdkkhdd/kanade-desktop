import type { BackendContext } from '../../types/plugins.js';
import { store } from '../../config/store.js';
import { createAdminApiClient } from '../../admin/api-client.js';

function client() {
  const k = store.get('kanade');
  return createAdminApiClient({ adminApiKey: k.adminApiKey, apiBase: k.apiBase });
}

export function setupBackend(ctx: BackendContext): void {
  ctx.ipc.handle('get-channel', async (...args) => {
    const { externalId } = args[0] as { externalId: string };
    return client().request('GET', `/admin/channels/youtube/${encodeURIComponent(externalId)}`);
  });

  ctx.ipc.handle('search-artists', async (...args) => {
    const { q } = args[0] as { q: string };
    return client().request('GET', `/admin/search/artists${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  });

  ctx.ipc.handle('link-artist', async (...args) => {
    const { externalId, artistId } = args[0] as { externalId: string; artistId: number };
    const c = client();
    const upsert = await c.request('POST', '/admin/channels', { platform: 'youtube', externalId });
    if (!upsert.ok && (upsert as any).error.code !== 'DUPLICATE') return upsert;
    return c.request('POST', `/admin/channels/youtube/${encodeURIComponent(externalId)}/artists`, { artistId });
  });

  ctx.ipc.handle('create-artist-and-link', async (...args) => {
    const { externalId, newArtist } = args[0] as { externalId: string; newArtist: import('../../admin/types.js').NewArtistInput };
    const c = client();
    const artistRes = await c.request<{ id: number }>('POST', '/admin/artists', newArtist);
    if (!artistRes.ok) return artistRes;
    const upsert = await c.request('POST', '/admin/channels', { platform: 'youtube', externalId });
    if (!upsert.ok && (upsert as any).error.code !== 'DUPLICATE') return upsert;
    return c.request('POST', `/admin/channels/youtube/${encodeURIComponent(externalId)}/artists`, { artistId: artistRes.data.id });
  });

  ctx.ipc.handle('unlink-artist', async (...args) => {
    const { externalId, artistId } = args[0] as { externalId: string; artistId: number };
    return client().request('DELETE', `/admin/channels/youtube/${encodeURIComponent(externalId)}/artists/${artistId}`);
  });
}
