// Resolves the YouTube channel external ID (UC...) for the current page.
//
// YouTube's SPA does not refresh canonical / og:url / ytInitialData when
// transitioning between pages — they keep pointing at whatever URL was
// active at the initial page load. DOM sources are only trustworthy for
// that initial URL's channel; any subsequent SPA-nav puts us in a "stale"
// state that the caller must resolve by forcing a full reload.
//
// Channel URL forms YouTube serves:
//   /channel/UC...        — canonical, ID is in the URL itself
//   /@handle              — modern handle URL
//   /c/customname         — legacy custom URL
//   /user/legacyname      — legacy user URL
//   /CustomName           — grandfathered bare vanity URL (some old channels;
//                           e.g. /Luciaaa_Sings). Indistinguishable from
//                           non-channel routes by path alone, so detection
//                           leans on canonical or DOM chrome.

const UC_IN_PATH = /\/channel\/(UC[\w-]{22})(?:\/|$|\?)/;

/** Stable key identifying the *channel* of the current path (not its
 *  subroute), used to detect SPA navigation between distinct channels. */
function currentPathKey(): string | null {
  const path = window.location.pathname;
  const uc = path.match(/^\/channel\/(UC[\w-]+)/);
  if (uc) return `uc:${uc[1]}`;
  const handle = path.match(/^\/@([^/]+)/);
  if (handle) return `h:${handle[1]}`;
  const cOrUser = path.match(/^\/(c|user)\/([^/]+)/);
  if (cOrUser) return `${cOrUser[1]}:${cOrUser[2]}`;
  // Bare first segment — covers vanity-URL channels and also non-channel
  // routes (/watch, /results, ...). Comparison is still correct: a stable
  // key for whatever the page is, so SPA-nav between pages flips it.
  const bare = path.match(/^\/([^/]+)/);
  if (bare) return `b:${bare[1]}`;
  return null;
}

/** The page's channel key at initial load. Refreshes on `load` in case
 *  preload observed a blank/transitional URL first. */
let pageLoadKey: string | null = currentPathKey();
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (pageLoadKey === null) pageLoadKey = currentPathKey();
  });
}

export function isChannelPage(): boolean {
  if (/^\/(channel\/|@|c\/|user\/)/.test(window.location.pathname)) return true;
  // Bare vanity URL fallback. canonical is accurate on a fresh load but
  // stale across SPA-nav from a non-channel page; the channel tab-bar
  // element catches the SPA-nav case once the new page's chrome renders.
  const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (canonical?.href.match(/\/channel\/UC[\w-]{22}/)) return true;
  return document.querySelector('.tabGroupShapeTabs[role="tablist"]') !== null;
}

/** True when DOM sources (canonical, og:url) can't be trusted against the
 *  current URL — i.e. the page's channel changed since initial load, so
 *  canonical still reflects the previous page. */
export function isStaleAfterSpaNav(): boolean {
  const key = currentPathKey();
  if (!key) return false;
  if (pageLoadKey === null) return true;
  return key !== pageLoadKey;
}

export function resolveChannelId(): string | null {
  // /channel/UC... URL: the ID is right there.
  const urlMatch = window.location.pathname.match(/^\/channel\/(UC[\w-]+)/);
  if (urlMatch) return urlMatch[1];

  // /@handle and legacy forms: canonical is YouTube's authoritative
  // mapping to /channel/UC..., reliable only while we're still on the
  // page that was initially loaded.
  if (isStaleAfterSpaNav()) return null;
  const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  return canonical?.href.match(UC_IN_PATH)?.[1] ?? null;
}

export function extractChannelName(): string {
  const header = document.querySelector('yt-page-header-renderer');
  const nameEl =
    header?.querySelector(
      'h1 .yt-core-attributed-string, h1, #text-container #text',
    ) ?? null;
  return (nameEl as HTMLElement | null)?.textContent?.trim() ?? '';
}
