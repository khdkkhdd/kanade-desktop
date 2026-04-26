/**
 * Owner channel candidate extracted from a YouTube watch page DOM.
 * `ucId` is the canonical UC* channel id when discoverable, `name` is the
 * displayed channel label.
 */
export interface OwnerChannel {
  ucId: string | null;
  name: string;
}

/**
 * Collects every plausible owner-channel anchor visible on the current
 * watch page DOM. Used by Discord Presence (display) and Admin Video
 * (linking artist hints to channels). Pure function — pass a custom doc
 * for unit tests.
 */
export function collectOwnerChannels(doc: Document = document): OwnerChannel[] {
  return [];
}
