import type { BackendContext } from '../../types/plugins.js';
import type {
  FetchVideoRequest,
  FetchWorkRequest,
  FetchArtistRelationsRequest,
  FetchArtistRecordingsRequest,
} from './types.js';

const API_BASE = process.env.KANADE_API_BASE ?? 'http://localhost:3000/api/v1/public';

async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function setupBackend(ctx: BackendContext): void {
  ctx.ipc.handle('fetch-video', async (...args: unknown[]) => {
    const req = args[0] as FetchVideoRequest;
    return fetchApi(`/video/youtube/${req.videoId}?lang=${req.lang}`);
  });

  ctx.ipc.handle('fetch-work-covers', async (...args: unknown[]) => {
    const req = args[0] as FetchWorkRequest;
    return fetchApi(
      `/work/${req.workId}/covers?lang=${req.lang}&offset=${req.offset}&limit=${req.limit}`,
    );
  });

  ctx.ipc.handle('fetch-work-originals', async (...args: unknown[]) => {
    const req = args[0] as FetchWorkRequest;
    return fetchApi(
      `/work/${req.workId}/originals?lang=${req.lang}&offset=${req.offset}&limit=${req.limit}`,
    );
  });

  ctx.ipc.handle('fetch-artist-relations', async (...args: unknown[]) => {
    const req = args[0] as FetchArtistRelationsRequest;
    return fetchApi(`/artist/${req.artistId}/relations?lang=${req.lang}`);
  });

  ctx.ipc.handle('fetch-artist-recordings', async (...args: unknown[]) => {
    const req = args[0] as FetchArtistRecordingsRequest;
    return fetchApi(
      `/artist/${req.artistId}/recordings?lang=${req.lang}&offset=${req.offset}&limit=${req.limit}`,
    );
  });
}
