import type { BackendContext } from '../../types/plugins.js';
import type {
  FetchVideoRequest,
  FetchSongGroupRequest,
  FetchArtistRelationsRequest,
  FetchArtistSongsRequest,
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

  ctx.ipc.handle('fetch-song-group-covers', async (...args: unknown[]) => {
    const req = args[0] as FetchSongGroupRequest;
    return fetchApi(
      `/song-group/${req.songGroupId}/covers?lang=${req.lang}&offset=${req.offset}&limit=${req.limit}`,
    );
  });

  ctx.ipc.handle('fetch-song-group-originals', async (...args: unknown[]) => {
    const req = args[0] as FetchSongGroupRequest;
    return fetchApi(
      `/song-group/${req.songGroupId}/originals?lang=${req.lang}&offset=${req.offset}&limit=${req.limit}`,
    );
  });

  ctx.ipc.handle('fetch-artist-relations', async (...args: unknown[]) => {
    const req = args[0] as FetchArtistRelationsRequest;
    return fetchApi(`/artist/${req.artistId}/relations?lang=${req.lang}`);
  });

  ctx.ipc.handle('fetch-artist-songs', async (...args: unknown[]) => {
    const req = args[0] as FetchArtistSongsRequest;
    return fetchApi(
      `/artist/${req.artistId}/songs?lang=${req.lang}&offset=${req.offset}&limit=${req.limit}`,
    );
  });
}
