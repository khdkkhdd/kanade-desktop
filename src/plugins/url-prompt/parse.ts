const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Parses user-typed input (URL or bare video ID) into a canonical YouTube
 * URL. Returns null for anything not recognisable so the caller can show an
 * inline error instead of blindly navigating to a junk URL.
 *
 * Accepted inputs:
 *   - Bare 11-char video ID (e.g. "dQw4w9WgXcQ")
 *   - https://www.youtube.com/watch?v=ID[&t=...]
 *   - https://music.youtube.com/watch?v=ID
 *   - https://youtu.be/ID[?t=...]
 *   - https://www.youtube.com/shorts/ID
 *   - URLs without the scheme (parser prepends https://)
 */
export function parseYouTubeInput(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  if (VIDEO_ID_RE.test(s)) {
    return `https://www.youtube.com/watch?v=${s}`;
  }

  let url: URL;
  try {
    url = new URL(s.startsWith('http://') || s.startsWith('https://') ? s : `https://${s}`);
  } catch {
    return null;
  }

  if (url.hostname === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '');
    if (!VIDEO_ID_RE.test(id)) return null;
    const params = new URLSearchParams(url.search);
    params.set('v', id);
    return `https://www.youtube.com/watch?${params.toString()}`;
  }

  const isYoutubeHost =
    url.hostname === 'youtube.com' ||
    url.hostname.endsWith('.youtube.com') ||
    url.hostname === 'youtube-nocookie.com' ||
    url.hostname.endsWith('.youtube-nocookie.com');

  if (!isYoutubeHost) return null;

  if (url.pathname === '/watch') {
    const id = url.searchParams.get('v') ?? '';
    if (!VIDEO_ID_RE.test(id)) return null;
    // Canonicalise music.youtube.com etc. → www.youtube.com so the main
    // window stays on one host; preserve other query params (t, list, ...).
    url.hostname = 'www.youtube.com';
    return url.toString();
  }

  const shortsMatch = url.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})\/?$/);
  if (shortsMatch) {
    return `https://www.youtube.com/shorts/${shortsMatch[1]}${url.search}`;
  }

  return null;
}
