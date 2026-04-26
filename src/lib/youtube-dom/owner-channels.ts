const UC_RE = /^UC[\w-]{22}$/;

/**
 * First UC channel id discoverable from the owner area's anchor hrefs.
 * Returns null when the owner anchors are non-href (e.g. javascript:void(0)
 * dropdown triggers used by YouTube for multi-creator collabs) — callers
 * should fall back to the main-world channel-id bridge or the legacy
 * `<meta itemprop="channelId">` tag in that case.
 */
export function findOwnerChannelUc(doc: Document = document): string | null {
  const anchors = doc.querySelectorAll<HTMLAnchorElement>(
    'ytd-video-owner-renderer a[href*="/channel/"], #owner a[href*="/channel/"]',
  );
  for (const a of anchors) {
    const href = a.getAttribute('href');
    if (!href) continue;
    const m = href.match(/\/channel\/(UC[\w-]{22})/);
    if (m && UC_RE.test(m[1])) return m[1];
  }
  return null;
}

interface MoviePlayerEl extends HTMLElement {
  getVideoData?: () => { author?: string };
}

function readPlayerAuthor(doc: Document): string | null {
  const player = doc.getElementById('movie_player') as MoviePlayerEl | null;
  const data = player?.getVideoData?.();
  const a = data?.author?.trim();
  return a && a.length > 0 ? a : null;
}

const LABEL_SELECTOR = 'ytd-video-owner-renderer a, #owner a';

/**
 * Single human-readable label for the owner area, used by Discord presence
 * as the fallback artist line. YouTube renders multi-creator videos with one
 * `javascript:void(0)` anchor whose textContent already contains the
 * pre-joined creator names (e.g. "Kotoha 및 星川サラ / Sara Hoshikawa") —
 * we surface that text verbatim. Falls back to `movie_player.getVideoData().author`
 * when the owner area itself is empty.
 */
export function extractOwnerLabel(doc: Document = document): string | null {
  const anchors = doc.querySelectorAll<HTMLAnchorElement>(LABEL_SELECTOR);
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const a of anchors) {
    const text = (a.textContent || '').trim();
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    labels.push(text);
  }
  if (labels.length > 0) return labels.join(', ');
  return readPlayerAuthor(doc);
}
