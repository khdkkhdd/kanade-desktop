import { pickTitle, pickMainTitle } from '../../shared/title-utils.js';
import { dedupeByArtistPublicId } from './utils.js';
import type { PlayerStateUpdate, ResolvedSongInfo, TitleLanguage } from './types.js';

interface ApiArtist {
  artistPublicId: string;
  name: string;
  role: string | null;
  isPublic: boolean;
}
interface ApiWork {
  publicId: string;
  titles: { language: string; title: string; isMain: boolean }[];
  creators: ApiArtist[];
}
interface ApiRecording {
  publicId: string;
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
    publicId: string;
    mainVideo: { platform: string; externalId: string } | null;
  }[];
  seed: number;
  nextOffset: number | null;
}

export async function resolveSongInfo(
  snapshot: PlayerStateUpdate,
  apiBase: string,
  titleLanguage: TitleLanguage = 'uilang',
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
    // Covers credit the performer only — the work creator belongs to the
    // origin. Originals surface both so the composer/lyricist appears
    // alongside the vocalist.
    const allCredits = rec.isOrigin
      ? [...rec.artists, ...rec.work.creators]
      : [...rec.artists];
    const credits = dedupeByArtistPublicId(allCredits);
    const visible = credits.filter((c) => c.isPublic);
    if (visible.length === 0) return fallback;

    const titleSource = rec.titles.length > 0 ? rec.titles : rec.work.titles;
    const title =
      titleLanguage === 'main'
        ? pickMainTitle(titleSource)
        : pickTitle(titleSource, uiLang);
    const artists = visible.map((c) => c.name).join(', ');
    const originUrl = rec.isOrigin
      ? null
      : await fetchOriginMainVideoUrl(apiBase, rec.work.publicId, uiLang);

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
  workPublicId: string,
  lang: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${apiBase}/public/works/${workPublicId}/recordings?isOrigin=true&limit=1&lang=${lang}`,
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
