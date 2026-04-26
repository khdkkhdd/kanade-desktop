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
