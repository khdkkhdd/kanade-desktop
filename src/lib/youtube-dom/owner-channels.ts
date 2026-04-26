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

/**
 * Collects every plausible owner-channel anchor visible on the current
 * watch page DOM. Used by Discord Presence (display) and Admin Video
 * (linking artist hints to channels). Pure function — pass a custom doc
 * for unit tests.
 */
export function collectOwnerChannels(doc: Document = document): OwnerChannel[] {
  const result: OwnerChannel[] = [];
  const anchors = doc.querySelectorAll<HTMLAnchorElement>(
    'ytd-video-owner-renderer a[href^="/channel/"], ytd-video-owner-renderer a[href^="/@"]',
  );
  for (const a of anchors) {
    const name = a.textContent?.trim();
    if (!name) continue;
    const ucId = extractUcFromHref(a.getAttribute('href'));
    result.push({ ucId, name });
  }
  return result;
}
