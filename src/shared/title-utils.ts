export interface TitleEntry {
  language: string;
  title: string;
  isMain: boolean;
}

/**
 * lang match first, then is_main, then the first entry.
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
 * Canonical title picker: isMain → first entry.
 * Discord Rich Presence shows titles in the main (canonical) language,
 * regardless of UI language.
 */
export function pickMainTitle(titles: TitleEntry[]): string {
  if (titles.length === 0) return '';
  const main = titles.find((t) => t.isMain);
  if (main) return main.title;
  return titles[0].title;
}

export function formatWithOriginal(
  displayed: string,
  original: string | undefined | null,
): string {
  if (!original || displayed === original) return displayed;
  return `${displayed} (${original})`;
}
