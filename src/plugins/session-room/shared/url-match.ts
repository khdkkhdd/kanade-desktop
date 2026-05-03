/**
 * Compares two URLs for "same video" equivalence in the context of the
 * session-room will-navigate sync guard.
 *
 * Two URLs are considered matching when they share the same protocol, hostname,
 * pathname, AND `v` query-parameter.  This tolerates:
 *   - Chromium URL normalisation (trailing slashes, percent-encoding case)
 *   - YouTube canonical redirects that append extra params (&pp=…, &si=…)
 *
 * Falls back to strict string equality when either URL is malformed.
 */
export function urlsMatchAsSync(a: string, b: string): boolean {
  let urlA: URL, urlB: URL;
  try {
    urlA = new URL(a);
    urlB = new URL(b);
  } catch {
    return a === b;
  }
  return (
    urlA.protocol === urlB.protocol &&
    urlA.hostname === urlB.hostname &&
    urlA.pathname === urlB.pathname &&
    urlA.searchParams.get('v') === urlB.searchParams.get('v')
  );
}
