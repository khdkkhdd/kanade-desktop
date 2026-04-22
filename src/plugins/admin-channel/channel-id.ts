// Resolves the YouTube channel external ID (UC...) for the current page.
// YouTube exposes a channel under four URL forms (/channel/UC..., /@handle,
// /c/name, /user/name) and the <meta itemprop="channelId"> tag isn't always
// present, so this module layers five strategies:
//   1. Direct URL match           — definitive, fast
//   2. Identity-keyed cache       — avoids re-extraction across sub-tabs
//   3. <meta itemprop="channelId">— classic approach, sometimes absent on @handle pages
//   4. <link rel="canonical">     — reliable on @handle pages where meta is missing
//   5. Most-frequent anchor       — heuristic fallback for custom layouts
//
// The cache is keyed on the part of the URL that survives sub-tab changes
// (e.g. /@foo/videos vs /@foo/playlists → same key), so it only grows by
// one entry per channel visited.

const UC_REGEX = /^UC[\w-]{22}$/;

const identityToChannelId = new Map<string, string>();

function getChannelIdentity(): string | null {
  const m = window.location.pathname.match(
    /^(\/channel\/UC[\w-]+|\/@[^/]+|\/c\/[^/]+|\/user\/[^/]+)/,
  );
  return m ? m[1] : null;
}

export function isChannelPage(): boolean {
  return /^\/(channel\/|@|c\/|user\/)/.test(window.location.pathname);
}

export function resolveChannelId(): string | null {
  const identity = getChannelIdentity();

  // 1. Direct URL form.
  const urlMatch = window.location.pathname.match(/^\/channel\/(UC[\w-]+)/);
  if (urlMatch) {
    if (identity) identityToChannelId.set(identity, urlMatch[1]);
    return urlMatch[1];
  }

  // 2. Cache hit — same handle-based URL resolved before.
  if (identity && identityToChannelId.has(identity)) {
    return identityToChannelId.get(identity)!;
  }

  // 3. <meta itemprop="channelId">
  const meta = document.querySelector(
    'meta[itemprop="channelId"]',
  ) as HTMLMetaElement | null;
  if (meta?.content && UC_REGEX.test(meta.content)) {
    if (identity) identityToChannelId.set(identity, meta.content);
    return meta.content;
  }

  // 4. <link rel="canonical"> href points at /channel/UC... on channel pages.
  const canonical = document.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;
  const canonicalMatch = canonical?.href.match(/\/channel\/(UC[\w-]{22})(?:\/|$|\?)/);
  if (canonicalMatch) {
    if (identity) identityToChannelId.set(identity, canonicalMatch[1]);
    return canonicalMatch[1];
  }

  // 5. Most-frequent /channel/UC... anchor on the page. The current channel
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

  if (winner && identity) identityToChannelId.set(identity, winner);
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
