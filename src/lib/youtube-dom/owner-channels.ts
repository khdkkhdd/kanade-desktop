/**
 * Owner channel candidate extracted from a YouTube watch page DOM.
 * `ucId` is the canonical UC* channel id when discoverable, `name` is the
 * displayed channel label.
 */
export interface OwnerChannel {
  ucId: string | null;
  name: string;
}

const UC_RE = /^UC[\w-]{22}$/;

function extractUcFromHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const m = href.match(/\/channel\/(UC[\w-]{22})/);
  return m && UC_RE.test(m[1]) ? m[1] : null;
}

function dedupe(items: OwnerChannel[]): OwnerChannel[] {
  const seenUc = new Set<string>();
  const seenName = new Set<string>();
  const out: OwnerChannel[] = [];
  for (const it of items) {
    if (it.ucId) {
      if (seenUc.has(it.ucId)) continue;
      seenUc.add(it.ucId);
      seenName.add(it.name);
      out.push(it);
    } else {
      if (seenName.has(it.name)) continue;
      seenName.add(it.name);
      out.push(it);
    }
  }
  return out;
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

const OWNER_SELECTORS = [
  'ytd-video-owner-renderer a[href^="/channel/"]',
  'ytd-video-owner-renderer a[href^="/@"]',
  '#owner a[href^="/channel/"]',
  '#owner a[href^="/@"]',
].join(', ');

/**
 * Collects every plausible owner-channel anchor visible on the current
 * watch page DOM. Used by Discord Presence (display) and Admin Video
 * (linking artist hints to channels). Pure function — pass a custom doc
 * for unit tests.
 */
export function collectOwnerChannels(doc: Document = document): OwnerChannel[] {
  const raw: OwnerChannel[] = [];
  const anchors = doc.querySelectorAll<HTMLAnchorElement>(OWNER_SELECTORS);
  for (const a of anchors) {
    const name = a.textContent?.trim();
    if (!name) continue;
    const ucId = extractUcFromHref(a.getAttribute('href'));
    raw.push({ ucId, name });
  }
  if (raw.length === 0) {
    const author = readPlayerAuthor(doc);
    if (author) raw.push({ ucId: null, name: author });
  }
  return dedupe(raw);
}
