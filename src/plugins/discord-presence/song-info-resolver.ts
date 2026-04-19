import { pickTitle } from '../../shared/title-utils.js';
import { dedupeByArtistId } from './utils.js';
import type { PlayerStateUpdate, ResolvedSongInfo } from './types.js';

interface ApiArtist {
  artistId: number;
  name: string;
  role: string | null;
  isPublic: boolean;
}
interface ApiWork {
  id: number;
  titles: { language: string; title: string; isMain: boolean }[];
  creators: ApiArtist[];
}
interface ApiRecording {
  id: number;
  isOrigin: boolean;
  titles: { language: string; title: string; isMain: boolean }[];
  artists: ApiArtist[];
  work: ApiWork;
  isMainVideo: boolean;
}
interface VideoResponseBody {
  data: {
    video: { platform: string; externalId: string };
    recordings: ApiRecording[];
  };
}
interface RecordingListBody {
  data: {
    id: number;
    mainVideo: { platform: string; externalId: string } | null;
  }[];
  seed: number;
  nextOffset: number | null;
}

export async function resolveSongInfo(
  snapshot: PlayerStateUpdate,
  apiBase: string,
): Promise<ResolvedSongInfo> {
  const { videoId, url, uiLang, domTitle, domChannel } = snapshot;
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const fallback: ResolvedSongInfo = {
    kind: 'fallback',
    title: domTitle || 'YouTube',
    artists: domChannel || 'YouTube',
    originUrl: null,
    thumbnailUrl,
    videoUrl: url,
  };

  try {
    const res = await fetch(`${apiBase}/public/videos/youtube/${videoId}?lang=${uiLang}`);
    if (!res.ok) return fallback;
    const body = (await res.json()) as VideoResponseBody;
    const recordings = body.data.recordings;
    if (recordings.length !== 1) return fallback;

    const rec = recordings[0];
    const credits = dedupeByArtistId([...rec.artists, ...rec.work.creators]);
    const visible = credits.filter((c) => c.isPublic);
    if (visible.length === 0) return fallback;

    const title = pickTitle(rec.titles, uiLang);
    const artists = visible.map((c) => c.name).join(', ');
    const originUrl = rec.isOrigin
      ? null
      : await fetchOriginMainVideoUrl(apiBase, rec.work.id, uiLang);

    return {
      kind: 'db',
      title: title || domTitle || 'YouTube',
      artists,
      originUrl,
      thumbnailUrl,
      videoUrl: url,
    };
  } catch {
    return fallback;
  }
}

async function fetchOriginMainVideoUrl(
  apiBase: string,
  workId: number,
  lang: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${apiBase}/public/works/${workId}/recordings?isOrigin=true&limit=1&lang=${lang}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as RecordingListBody;
    const items = body.data;
    if (items.length === 0 || !items[0].mainVideo) return null;
    const { platform, externalId } = items[0].mainVideo;
    if (platform !== 'youtube') return null;
    return `https://www.youtube.com/watch?v=${externalId}`;
  } catch {
    return null;
  }
}
