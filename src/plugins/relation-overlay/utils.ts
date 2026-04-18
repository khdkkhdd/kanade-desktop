import type { ArtistCredit, TitleEntry } from './types.js';

/**
 * Renders artist credits as "main1, main2 (feat. guest1, guest2)".
 * is_public=true are mains, is_public=false go into feat. parens.
 * If every credit is non-public, fall back to listing all.
 */
export function renderArtists(artists: Array<{ name: string; isPublic: boolean }>): string {
  if (artists.length === 0) return '';
  const mains = artists.filter((a) => a.isPublic);
  const others = artists.filter((a) => !a.isPublic);
  if (mains.length === 0) return artists.map((a) => a.name).join(', ');
  const mainStr = mains.map((a) => a.name).join(', ');
  const featStr = others.length ? ` (feat. ${others.map((a) => a.name).join(', ')})` : '';
  return mainStr + featStr;
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

/**
 * Credits with role labels — used for header creator/artist rows.
 * Role like "composer" gets a small bracketed tag after the name.
 */
export function formatCreditsWithRoles(credits: ArtistCredit[]): Array<{
  name: string;
  role: string | null;
  isPublic: boolean;
}> {
  return credits.map((c) => ({ name: c.name, role: c.role, isPublic: c.isPublic }));
}
