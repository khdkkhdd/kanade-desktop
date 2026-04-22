import type { BackendContext } from '../../types/plugins.js';
import { store } from '../../config/store.js';
import { createAdminApiClient } from '../../admin/api-client.js';
import type { AdminApiClient } from '../../admin/api-client.js';
import { isAdminKeyValid } from '../../admin/auth-check.js';
import { BrowserWindow } from 'electron';
import { performRegister } from './register.js';
import { performUpdate, performReassign, type UpdateVideoPayload, type ReassignVideoPayload } from './update.js';

function client(): AdminApiClient {
  const k = store.get('kanade');
  return createAdminApiClient({ adminApiKey: k.adminApiKey, apiBase: k.apiBase });
}

export function setupBackend(ctx: BackendContext): void {
  ctx.ipc.handle('check-auth', async () => {
    return { valid: await isAdminKeyValid(client()) };
  });

  ctx.ipc.handle('search-works', async (...args) => {
    const { q } = args[0] as { q: string };
    const qt = q?.trim() ?? '';
    return client().request('GET', `/admin/search/works${qt ? `?q=${encodeURIComponent(qt)}` : ''}`);
  });

  ctx.ipc.handle('search-recordings', async (...args) => {
    const { q } = args[0] as { q: string };
    const qt = q?.trim() ?? '';
    return client().request('GET', `/admin/search/recordings${qt ? `?q=${encodeURIComponent(qt)}` : ''}`);
  });

  ctx.ipc.handle('search-artists', async (...args) => {
    const { q } = args[0] as { q: string };
    const qt = q?.trim() ?? '';
    return client().request('GET', `/admin/search/artists${qt ? `?q=${encodeURIComponent(qt)}` : ''}`);
  });

  ctx.ipc.handle('get-work', async (...args) => {
    const { id } = args[0] as { id: number };
    return client().request('GET', `/admin/works/${id}`);
  });

  ctx.ipc.handle('get-recording', async (...args) => {
    const { id } = args[0] as { id: number };
    return client().request('GET', `/admin/recordings/${id}`);
  });

  ctx.ipc.handle('list-work-recordings', async (...args) => {
    const { workId } = args[0] as { workId: number };
    return client().request('GET', `/admin/works/${workId}`);
  });

  ctx.ipc.handle('get-channel-hint', async (...args) => {
    const { externalId } = args[0] as { externalId: string };
    return client().request('GET', `/admin/channels/youtube/${encodeURIComponent(externalId)}`);
  });

  ctx.ipc.handle('get-video-state', async (...args) => {
    const { videoId } = args[0] as { videoId: string };
    const r = await client().request(
      'GET',
      `/admin/videos/youtube/${encodeURIComponent(videoId)}`,
    );
    if (!r.ok) {
      // 404 from admin endpoint means the video isn't registered yet —
      // the drawer opens in create mode with no initial data.
      return { ok: true, data: { registered: false } };
    }
    const data = (r as any).data;
    const recordings = data?.recordings ?? [];
    return { ok: true, data: { registered: recordings.length > 0, video: data } };
  });

  ctx.ipc.handle('register', async (...args) => {
    const payload = args[0] as import('../../admin/types.js').RegisterVideoPayload;
    const result = await performRegister(client(), payload);
    if (result.ok) {
      for (const w of BrowserWindow.getAllWindows()) {
        w.webContents.send('admin-video:data-changed', { videoId: payload.videoId });
      }
    }
    return result;
  });

  ctx.ipc.handle('update', async (...args) => {
    const payload = args[0] as UpdateVideoPayload;
    const result = await performUpdate(client(), payload);
    if (result.ok) {
      for (const w of BrowserWindow.getAllWindows()) {
        w.webContents.send('admin-video:data-changed', { videoId: payload.videoId });
      }
    }
    return result;
  });

  ctx.ipc.handle('reassign', async (...args) => {
    const payload = args[0] as ReassignVideoPayload;
    const result = await performReassign(client(), payload);
    if (result.ok) {
      for (const w of BrowserWindow.getAllWindows()) {
        w.webContents.send('admin-video:data-changed', { videoId: payload.videoId });
      }
    }
    return result;
  });

  ctx.ipc.handle('delete-video', async (...args) => {
    const { videoId, recordingId, externalVideoId } = args[0] as {
      videoId: string;
      recordingId: number;
      externalVideoId: number;
    };
    const r = await client().request('DELETE', `/admin/recordings/${recordingId}/videos/${externalVideoId}`);
    if (r.ok) {
      for (const w of BrowserWindow.getAllWindows()) {
        w.webContents.send('admin-video:data-changed', { videoId });
      }
    }
    return r;
  });
}
