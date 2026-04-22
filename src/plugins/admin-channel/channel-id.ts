// Resolves the YouTube channel external ID (UC...) for the current page.
//
// YouTube's SPA does not refresh canonical / og:url / ytInitialData when
// transitioning between two channel pages — they keep pointing at the
// channel that was active at the initial page load. So DOM sources are
// only trustworthy for the handle that was in the URL when the page first
// loaded; any subsequent SPA-nav to a different channel puts us in a
// "stale" state that the caller must resolve by forcing a full reload.

const UC_IN_PATH = /\/channel\/(UC[\w-]{22})(?:\/|$|\?)/;

function currentHandle(): string | null {
  return window.location.pathname.match(/^\/@([^/]+)/)?.[1] ?? null;
}

/** The URL's @handle at the moment preload ran. Refreshes on `load` in
 *  case preload observed a blank/transitional URL first. */
let pageLoadHandle: string | null = currentHandle();
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (pageLoadHandle === null) pageLoadHandle = currentHandle();
  });
}

export function isChannelPage(): boolean {
  return /^\/(channel\/|@|c\/|user\/)/.test(window.location.pathname);
}

/** True when the URL's @handle can't be trusted against the DOM sources.
 *  Two cases: the handle changed since initial load, OR we loaded on a
 *  non-channel page (watch, search, …) and SPA-navved into a channel,
 *  so canonical/og:url still reflect that prior page. */
export function isStaleAfterSpaNav(): boolean {
  const handle = currentHandle();
  if (!handle) return false;
  if (pageLoadHandle === null) return true;
  return handle !== pageLoadHandle;
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
