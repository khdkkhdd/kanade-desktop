/**
 * Returns true when `url` is safe to persist as `lastUrl` or use as the main
 * window's boot URL. Filters out:
 *   - non-http(s) protocols (file://, chrome://, etc.)
 *   - loopback hosts (localhost / 127.0.0.1 / ::1) — dev settings/admin
 *     windows are served from http://localhost during `pnpm dev`, so blindly
 *     accepting any http(s) value lets those internal URLs poison the
 *     persisted lastUrl and break the next boot.
 */
export function isSafeWebUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  if (!(url.startsWith('http://') || url.startsWith('https://'))) return false;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') return false;
  return true;
}

/**
 * Stricter than `isSafeWebUrl`: also requires the URL to be on YouTube
 * (`youtube.com`, any `*.youtube.com`, or `youtu.be`). Use this for the
 * persisted `lastUrl` boot path so a YouTube `/redirect?q=…` wrapper that
 * navigates the main window to an external domain (or a directly-pasted
 * external URL) does not contaminate the next boot.
 */
export function isSafeYouTubeUrl(url: string | undefined | null): url is string {
  if (!isSafeWebUrl(url)) return false;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  return host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be';
}
