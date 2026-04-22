import type { TitleInput } from './types.js';

export function normalizeTitles(titles: TitleInput[]): TitleInput[] {
  const nonEmpty = titles
    .map((t) => ({ ...t, title: t.title.trim() }))
    .filter((t) => t.title !== '');
  if (nonEmpty.length === 0) return [];
  // Promote the first surviving row to isMain when the caller's flagged row
  // was filtered out (or no flag was set) — the server requires exactly one.
  const mainIdx = Math.max(0, nonEmpty.findIndex((t) => t.isMain));
  return nonEmpty.map((t, i) => ({ ...t, isMain: i === mainIdx }));
}
