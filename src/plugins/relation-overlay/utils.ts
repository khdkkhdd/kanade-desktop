/**
 * Renders artist credits as "name1, name2". `isPublic` controls default-view
 * visibility — non-public credits are hidden here and only surface in detailed
 * views (e.g. the artist chip panel). If nobody is flagged public (e.g.
 * migrated data), fall back to listing all so the line isn't blank.
 */
export function renderArtists(artists: Array<{ name: string; isPublic: boolean }>): string {
  if (artists.length === 0) return '';
  const publicOnes = artists.filter((a) => a.isPublic);
  const shown = publicOnes.length > 0 ? publicOnes : artists;
  return shown.map((a) => a.name).join(', ');
}

export { pickTitle } from '../../shared/title-utils.js';

/**
 * Platforms the overlay knows how to link out to. Unknown platforms are
 * filtered out before rendering so we never produce a dead `<a href="#">`.
 */
export const SUPPORTED_PLATFORMS = ['youtube', 'niconico'] as const;
export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

export function isSupportedPlatform(p: string): p is SupportedPlatform {
  return (SUPPORTED_PLATFORMS as readonly string[]).includes(p);
}

export function externalUrlFor(video: { platform: string; externalId: string }): string | null {
  if (video.platform === 'niconico') return `https://www.nicovideo.jp/watch/${video.externalId}`;
  return null;
}

