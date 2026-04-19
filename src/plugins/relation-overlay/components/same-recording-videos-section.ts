import type { RendererContext } from '../../../types/plugins.js';
import type { ArtistCredit, RecordingVideo, VideoRecording } from '../types.js';
import { pickTitle, renderArtists, externalUrlFor, isSupportedPlatform } from '../utils.js';

// Merge performers + work creators for origin recordings — mirrors the logic
// in video-item.ts so "empty recording_artists on an origin" still shows the
// song's composer/lyricist instead of an empty artist line.
function mergeCredits(performers: ArtistCredit[], creators: ArtistCredit[]): ArtistCredit[] {
  const byId = new Map<number, ArtistCredit>();
  for (const c of [...performers, ...creators]) {
    const existing = byId.get(c.artistId);
    if (!existing) byId.set(c.artistId, { ...c });
    else existing.isPublic = existing.isPublic || c.isPublic;
  }
  return [...byId.values()];
}

/**
 * Other external videos linked to the same recording. No pagination —
 * /recordings/:id/videos returns the full list in one shot.
 * Returns null when the recording has only one video (the current one).
 */
export async function createSameRecordingVideosSection(
  recording: VideoRecording,
  currentVideoId: string,
  lang: string,
  ctx: RendererContext,
): Promise<HTMLElement | null> {
  const raw = (await ctx.ipc.invoke('fetch-recording-videos', {
    recordingId: recording.id,
  })) as { data: RecordingVideo[] } | null;

  const videos = (raw?.data ?? []).filter(
    (v) => !(v.platform === 'youtube' && v.externalId === currentVideoId),
  );
  if (videos.length === 0) return null;

  const root = document.createElement('div');
  root.className = 'kanade-card-list';

  const title =
    recording.titles.length > 0 ? pickTitle(recording.titles, lang) : pickTitle(recording.work.titles, lang);
  const credits = recording.isOrigin
    ? mergeCredits(recording.artists, recording.work.creators)
    : recording.artists;
  const artistLine = renderArtists(credits);

  for (const v of videos) {
    const card = createPlatformVideoCard(v, title, artistLine);
    if (card) root.appendChild(card);
  }

  return root;
}

function createPlatformVideoCard(
  video: RecordingVideo,
  title: string,
  artistLine: string,
): HTMLAnchorElement | null {
  if (video.platform === 'youtube') {
    const link = document.createElement('a');
    link.className = 'kanade-video-item';
    link.href = `/watch?v=${video.externalId}`;

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'kanade-video-thumb-wrap';

    const thumb = document.createElement('img');
    thumb.className = 'kanade-video-thumb';
    thumb.src = `https://i.ytimg.com/vi/${video.externalId}/mqdefault.jpg`;
    thumb.loading = 'lazy';
    thumb.alt = title;
    thumbWrap.appendChild(thumb);

    if (video.isMain) {
      const badge = document.createElement('span');
      badge.className = 'kanade-card-badge kanade-card-badge-main';
      badge.textContent = 'MAIN';
      thumbWrap.appendChild(badge);
    }

    const info = document.createElement('div');
    info.className = 'kanade-video-info';
    const titleEl = document.createElement('div');
    titleEl.className = 'kanade-video-title';
    titleEl.textContent = title;
    const artistEl = document.createElement('div');
    artistEl.className = 'kanade-video-artist';
    artistEl.textContent = artistLine;
    info.appendChild(titleEl);
    info.appendChild(artistEl);

    link.appendChild(thumbWrap);
    link.appendChild(info);

    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = `/watch?v=${video.externalId}`;
    });
    return link;
  }

  // Non-YouTube platforms (niconico, etc.) — external link out.
  if (!isSupportedPlatform(video.platform)) return null;
  const externalUrl = externalUrlFor(video);
  if (!externalUrl) return null;
  const link = document.createElement('a');
  link.className = 'kanade-video-item';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.href = externalUrl;

  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'kanade-video-thumb-wrap kanade-video-thumb-placeholder';
  const platformBadge = document.createElement('span');
  platformBadge.className = 'kanade-card-platform';
  platformBadge.textContent = video.platform;
  thumbWrap.appendChild(platformBadge);

  const info = document.createElement('div');
  info.className = 'kanade-video-info';
  const titleEl = document.createElement('div');
  titleEl.className = 'kanade-video-title';
  titleEl.textContent = title;
  const artistEl = document.createElement('div');
  artistEl.className = 'kanade-video-artist';
  artistEl.textContent = artistLine;
  info.appendChild(titleEl);
  info.appendChild(artistEl);

  link.appendChild(thumbWrap);
  link.appendChild(info);
  return link;
}
