import { collectOwnerChannels } from '../../lib/youtube-dom/owner-channels.js';

/**
 * YouTube's `document.title` sometimes flips early to the "next up" video's
 * title in a Mix autoplay queue, creating a window where it disagrees with
 * the URL's videoId. Using the player's internal `getVideoData()` instead
 * returns the actually-playing video's metadata, sidestepping this race.
 *
 * @returns title — falls back to document.title if the player can't be read.
 */
export function extractDomTitle(): string {
  const player = getMoviePlayer();
  const data = player?.getVideoData?.();
  if (data?.title) return data.title.trim();

  // Fallback: document.title cleaning. Unreliable during Mix transitions.
  return document.title
    .replace(/^\(\d+\)\s*/, '')
    .replace(/\s*-\s*YouTube\s*$/i, '')
    .trim();
}

/**
 * Extracts the channel label for Discord presence's fallback artist line.
 * Joins collab/multi-channel uploads with ", " so "by YouTube" no longer
 * appears on videos with multiple credited owner channels. Shorts use a
 * dedicated handle anchor because the watch page DOM stays stale during
 * shorts playback.
 */
export function extractDomChannel(): string | null {
  if (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/shorts/')) {
    return extractShortsChannelHandle();
  }

  const owners = collectOwnerChannels();
  if (owners.length === 0) return null;
  return owners.map((o) => o.name).join(', ');
}

function extractShortsChannelHandle(): string | null {
  // Shorts overlay anchors specifically link to the channel's /shorts tab
  // (e.g. "/@nbuna/shorts"), which distinguishes them from the subscription
  // sidebar's "/@handle" links that stay visible while a Short plays.
  const vh = window.innerHeight;
  const links = document.querySelectorAll<HTMLAnchorElement>(
    'a[href^="/@"][href$="/shorts"], a[href*="/channel/"][href$="/shorts"]',
  );
  for (const a of links) {
    const r = a.getBoundingClientRect();
    const visible = r.width > 0 && r.height > 0 && r.top < vh && r.bottom > 0;
    if (!visible) continue;
    const text = a.textContent?.trim();
    if (text) return text;
  }
  return null;
}

/**
 * Reads the currently-playing videoId from the player's internal state rather
 * than the URL's `v=` parameter. Useful during Mix transitions when the URL
 * and player get temporarily out of sync.
 */
export function getPlayerVideoId(): string | null {
  const player = getMoviePlayer();
  const data = player?.getVideoData?.();
  if (data?.video_id) return data.video_id;
  return null;
}

interface YouTubeMoviePlayer {
  getVideoData?: () => { video_id?: string; title?: string; author?: string };
}

function getMoviePlayer(): YouTubeMoviePlayer | null {
  return document.getElementById('movie_player') as YouTubeMoviePlayer | null;
}
