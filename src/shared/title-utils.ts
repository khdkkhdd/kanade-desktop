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
