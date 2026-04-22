import type { ArtistCredit, RecordingListItem } from '../types.js';
import { renderArtists, externalUrlFor, isSupportedPlatform, niconicoThumbUrl } from '../utils.js';

export interface VideoItemOptions {
  showTitle?: boolean;
}

/**
 * Card for a recording. YouTube recordings get in-app navigation; other
 * supported platforms (niconico) get a placeholder thumb and open externally
 * — the main process's window-open handler routes to the OS default browser.
 * - `showTitle`: when false (same-recording section), the title line is
 *   omitted because every card represents the same recording.
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

  if (!recording.mainVideo) return null;
  if (!isSupportedPlatform(recording.mainVideo.platform)) return null;

  const { platform, externalId } = recording.mainVideo;
  const isYoutube = platform === 'youtube';

  const link = document.createElement('a');
  link.className = 'kanade-video-item';

  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'kanade-video-thumb-wrap';

  if (isYoutube) {
    const thumb = document.createElement('img');
    thumb.className = 'kanade-video-thumb';
    thumb.src = `https://i.ytimg.com/vi/${externalId}/mqdefault.jpg`;
    thumb.loading = 'lazy';
    thumb.alt = recording.title;
    thumbWrap.appendChild(thumb);
  } else {
    const thumbUrl = platform === 'niconico' ? niconicoThumbUrl(externalId) : null;
    if (thumbUrl) {
      const thumb = document.createElement('img');
      thumb.className = 'kanade-video-thumb';
      thumb.src = thumbUrl;
      thumb.loading = 'lazy';
      thumb.alt = recording.title;
      thumb.onerror = () => {
        thumb.remove();
        thumbWrap.classList.add('kanade-video-thumb-placeholder');
      };
      thumbWrap.appendChild(thumb);
    } else {
      thumbWrap.classList.add('kanade-video-thumb-placeholder');
    }
    const platformBadge = document.createElement('span');
    platformBadge.className = 'kanade-card-platform';
    platformBadge.textContent = platform;
    thumbWrap.appendChild(platformBadge);
  }

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

  if (isYoutube) {
    link.href = `/watch?v=${externalId}`;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = `/watch?v=${externalId}`;
    });
  } else {
    const externalUrl = externalUrlFor(recording.mainVideo);
    if (!externalUrl) return null;
    link.href = externalUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  return link;
}

// Dedup by artistPublicId, performers first, then work creators. If the same
// artist appears in both rows, is_public becomes true when either side is public.
function mergeCredits(performers: ArtistCredit[], creators: ArtistCredit[]): ArtistCredit[] {
  const byId = new Map<string, ArtistCredit>();
  for (const c of [...performers, ...creators]) {
    const existing = byId.get(c.artistPublicId);
    if (!existing) {
      byId.set(c.artistPublicId, { ...c });
    } else {
      existing.isPublic = existing.isPublic || c.isPublic;
    }
  }
  return [...byId.values()];
}
