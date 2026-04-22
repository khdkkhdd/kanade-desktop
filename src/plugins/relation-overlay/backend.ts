import type { BackendContext } from '../../types/plugins.js';
import type {
  FetchVideoRequest,
  FetchWorkRecordingsRequest,
  FetchRecordingVideosRequest,
  FetchArtistRecordingsRequest,
  FetchArtistRelationsRequest,
} from './types.js';
import { store } from '../../config/store.js';

function getPublicBase(): string {
  const base = process.env.KANADE_API_BASE ?? store.get('kanade').apiBase;
  return `${base}/public`;
}

async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getPublicBase()}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function queryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  const qs = new URLSearchParams();
  for (const [k, v] of entries) qs.set(k, String(v));
  return `?${qs.toString()}`;
}

export function setupBackend(ctx: BackendContext): void {
  ctx.ipc.handle('fetch-video', async (...args: unknown[]) => {
    const req = args[0] as FetchVideoRequest;
    return fetchApi(`/videos/youtube/${req.videoId}${queryString({ lang: req.lang })}`);
  });

  ctx.ipc.handle('fetch-work-recordings', async (...args: unknown[]) => {
    const req = args[0] as FetchWorkRecordingsRequest;
    return fetchApi(
      `/works/${req.workPublicId}/recordings${queryString({
        lang: req.lang,
        isOrigin: req.isOrigin,
        exclude: req.excludePublicId,
        seed: req.seed,
        offset: req.offset,
        limit: req.limit,
      })}`,
    );
  });

  ctx.ipc.handle('fetch-recording-videos', async (...args: unknown[]) => {
    const req = args[0] as FetchRecordingVideosRequest;
    return fetchApi(`/recordings/${req.recordingPublicId}/videos`);
  });

  ctx.ipc.handle('fetch-artist-recordings', async (...args: unknown[]) => {
    const req = args[0] as FetchArtistRecordingsRequest;
    return fetchApi(
      `/artists/${req.artistPublicId}/recordings${queryString({
        lang: req.lang,
        seed: req.seed,
        offset: req.offset,
        limit: req.limit,
      })}`,
    );
  });

  ctx.ipc.handle('fetch-artist-relations', async (...args: unknown[]) => {
    const req = args[0] as FetchArtistRelationsRequest;
    return fetchApi(`/artists/${req.artistPublicId}/relations${queryString({ lang: req.lang })}`);
  });
}
