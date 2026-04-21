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
 * Extracts the channel name. Prefers the player's getVideoData().author, and
 * falls back to the ytd-channel-name element.
 */
export function extractDomChannel(): string | null {
  const player = getMoviePlayer();
  const data = player?.getVideoData?.();
  if (data?.author) return data.author.trim() || null;

  const el = document.querySelector('ytd-watch-metadata ytd-channel-name #text');
  const name = el?.textContent?.trim();
  return name && name.length > 0 ? name : null;
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
