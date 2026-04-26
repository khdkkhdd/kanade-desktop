/**
 * Owner channel candidate extracted from a YouTube watch page DOM.
 * `ucId` is the canonical UC* channel id when discoverable, `name` is the
 * displayed channel label (best-effort, may include leading punctuation
 * trimmed for description-body mentions).
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

function cleanAnchorText(text: string): string {
  // Description-body @handle anchors render as "/ @marumochi_official" with
  // a leading slash separator. Strip leading whitespace + slashes/pipes/bullets
  // and trailing whitespace so the resulting label is the bare handle.
  return text.replace(/^[\s\/|·•、，,]+/, '').replace(/\s+$/, '');
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

const CHANNEL_SELECTORS = [
  'ytd-video-owner-renderer a[href*="/channel/"]',
  'ytd-video-owner-renderer a[href*="/@"]',
  '#owner a[href*="/channel/"]',
  '#owner a[href*="/@"]',
  'ytd-expandable-video-description-body-renderer a[href*="/channel/"]',
  'ytd-expandable-video-description-body-renderer a[href*="/@"]',
].join(', ');

/**
 * Collects all UC-bearing owner-channel candidates by combining the owner
 * area and the description body. Used by Admin Video to fan out artist-hint
 * lookups across every credited channel — multi-creator collab uploads put
 * the second/third creator's `/@handle` only in the description, not the
 * owner chip. Anchors inside `button-view-model` (the auto-generated music
 * attribution card) are excluded because they're meta navigation buttons,
 * not creator credits.
 */
export function collectOwnerChannels(doc: Document = document): OwnerChannel[] {
  const raw: OwnerChannel[] = [];
  const anchors = doc.querySelectorAll<HTMLAnchorElement>(CHANNEL_SELECTORS);
  for (const a of anchors) {
    if (a.closest('button-view-model')) continue;
    const cleaned = cleanAnchorText(a.textContent || '');
    if (!cleaned) continue;
    const ucId = extractUcFromHref(a.getAttribute('href'));
    raw.push({ ucId, name: cleaned });
  }
  if (raw.length === 0) {
    const author = readPlayerAuthor(doc);
    if (author) raw.push({ ucId: null, name: author });
  }
  return dedupe(raw);
}
