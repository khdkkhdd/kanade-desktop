// Resolves the YouTube channel external ID (UC...) for the current page.
// YouTube exposes a channel under four URL forms (/channel/UC..., /@handle,
// /c/name, /user/name) and the <meta itemprop="channelId"> tag isn't always
// present, so this module layers four strategies:
//   1. Direct URL match           — definitive, fast
//   2. <meta itemprop="channelId">— classic approach, sometimes absent on @handle pages
//   3. <link rel="canonical">     — reliable on @handle pages where meta is missing
//   4. Most-frequent anchor       — heuristic fallback for custom layouts
//
// No caching: YouTube's SPA updates the URL before refreshing <meta>/<link>/
// anchors, so an extraction triggered during that window captures the
// PREVIOUS channel's UC. Caching that under the new identity would poison
// all subsequent lookups for this channel until a full page reload. Callers
// should always re-extract against the current DOM.

const UC_REGEX = /^UC[\w-]{22}$/;

export function isChannelPage(): boolean {
  return /^\/(channel\/|@|c\/|user\/)/.test(window.location.pathname);
}

export function resolveChannelId(): string | null {
  // 1. Direct URL form.
  const urlMatch = window.location.pathname.match(/^\/channel\/(UC[\w-]+)/);
  if (urlMatch) return urlMatch[1];

  // 2. <meta itemprop="channelId">
  const meta = document.querySelector(
    'meta[itemprop="channelId"]',
  ) as HTMLMetaElement | null;
  if (meta?.content && UC_REGEX.test(meta.content)) return meta.content;

  // 3. <link rel="canonical"> href points at /channel/UC... on channel pages.
  const canonical = document.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;
  const canonicalMatch = canonical?.href.match(/\/channel\/(UC[\w-]{22})(?:\/|$|\?)/);
  if (canonicalMatch) return canonicalMatch[1];

  // 4. Most-frequent /channel/UC... anchor on the page. The current channel
  //    is referenced by many internal nav links (tabs, breadcrumbs), so it
  //    dominates in frequency. Studio links are filtered out. Require ≥2
  //    occurrences to avoid picking up incidental /channel/ links.
  const counts = new Map<string, number>();
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    if (!href || href.includes('studio.youtube.com')) return;
    if (!href.startsWith('/channel/') && !href.includes('youtube.com/channel/')) return;
    const match = href.match(/\/channel\/(UC[\w-]{22})/);
    if (!match) return;
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  });
  let winner: string | null = null;
  let max = 1;
  for (const [id, n] of counts) {
    if (n > max) {
      max = n;
      winner = id;
    }
  }
  return winner;
}

export function extractChannelName(): string {
  const header = document.querySelector('yt-page-header-renderer');
  const nameEl =
    header?.querySelector(
      'h1 .yt-core-attributed-string, h1, #text-container #text',
    ) ?? null;
  return (nameEl as HTMLElement | null)?.textContent?.trim() ?? '';
}
