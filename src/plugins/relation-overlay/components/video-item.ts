import type { ArtistCredit, RecordingListItem } from '../types.js';
import { renderArtists } from '../utils.js';

export interface VideoItemOptions {
  showTitle?: boolean;
}

/**
 * Card for a recording. Uses its mainVideo thumbnail.
 * - `showTitle`: when false (same-work / same-recording sections), the title
 *   line is omitted (redundant with context).
 * - Artist line: for origin recordings we merge work_creators into the
 *   credit list so the composer/lyricist shows alongside the vocalist.
 *   Covers show only the recording artists (the creator is the origin's
 *   writer, not this cover's contributor).
 */
export function createVideoItem(
  recording: RecordingListItem,
  options: VideoItemOptions = {},
): HTMLAnchorElement | null {
  const { showTitle = true } = options;

  if (!recording.mainVideo || recording.mainVideo.platform !== 'youtube') return null;
  const videoId = recording.mainVideo.externalId;

  const link = document.createElement('a');
  link.className = 'kanade-video-item';
  link.href = `/watch?v=${videoId}`;

  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'kanade-video-thumb-wrap';

  const thumb = document.createElement('img');
  thumb.className = 'kanade-video-thumb';
  thumb.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  thumb.loading = 'lazy';
  thumb.alt = recording.title;
  thumbWrap.appendChild(thumb);

  const info = document.createElement('div');
  info.className = 'kanade-video-info';

  if (showTitle) {
    const title = document.createElement('div');
    title.className = 'kanade-video-title';
    title.textContent = recording.title || recording.workTitle;
    info.appendChild(title);
  }

  const artist = document.createElement('div');
  artist.className = 'kanade-video-artist';
  const credits = recording.isOrigin
    ? mergeCredits(recording.artists, recording.workCreators)
    : recording.artists;
  artist.textContent = renderArtists(credits);
  info.appendChild(artist);

  link.appendChild(thumbWrap);
  link.appendChild(info);

  link.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = `/watch?v=${videoId}`;
  });

  return link;
}

// Dedup by artistId, performers first, then work creators. If the same
// artist appears in both rows, is_public becomes true when either side is public.
function mergeCredits(performers: ArtistCredit[], creators: ArtistCredit[]): ArtistCredit[] {
  const byId = new Map<number, ArtistCredit>();
  for (const c of [...performers, ...creators]) {
    const existing = byId.get(c.artistId);
    if (!existing) {
      byId.set(c.artistId, { ...c });
    } else {
      existing.isPublic = existing.isPublic || c.isPublic;
    }
  }
  return [...byId.values()];
}
