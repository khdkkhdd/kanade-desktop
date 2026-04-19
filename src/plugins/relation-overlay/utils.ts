import type { TitleEntry } from './types.js';

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

/**
 * Pick a title matching lang first, then is_main, then the first entry.
 */
export function pickTitle(titles: TitleEntry[], lang: string): string {
  if (titles.length === 0) return '';
  const langMatch = titles.find((t) => t.language === lang);
  if (langMatch) return langMatch.title;
  const main = titles.find((t) => t.isMain);
  if (main) return main.title;
  return titles[0].title;
}

