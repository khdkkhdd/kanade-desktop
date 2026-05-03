/**
 * YouTube wraps external links in video descriptions / comments as
 * `https://www.youtube.com/redirect?event=video_description&q=<encoded-target>`.
 * Treating those as YouTube URLs (they share the host) means click-interceptor
 * routes them to the browse window, which then auto-redirects to the external
 * site — bypassing our "외부 도메인은 OS 기본 브라우저" rule.
 *
 * `unwrapYouTubeRedirect` returns the decoded target when `url` is a YouTube
 * redirect wrapper, otherwise returns `url` unchanged.
 */
export function unwrapYouTubeRedirect(url: string): string {
  let u: URL;
  try { u = new URL(url); } catch { return url; }
  if (u.hostname !== 'www.youtube.com' && u.hostname !== 'youtube.com') return url;
  if (u.pathname !== '/redirect') return url;
  const target = u.searchParams.get('q');
  if (!target) return url;
  return target;
}
