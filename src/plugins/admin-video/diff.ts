export interface TitleSnapshot {
  language: string;
  title: string;
  isMain: boolean;
}

export type TitleDiff =
  | { op: 'add'; title: TitleSnapshot }
  | { op: 'remove'; language: string }
  | { op: 'update'; language: string; title: { title: string; isMain: boolean } };

export function computeTitleDiff(before: TitleSnapshot[], after: TitleSnapshot[]): TitleDiff[] {
  const diff: TitleDiff[] = [];
  const beforeMap = new Map(before.map((t) => [t.language, t]));
  const afterMap = new Map(after.map((t) => [t.language, t]));

  for (const [lang, a] of afterMap) {
    const b = beforeMap.get(lang);
    if (!b) diff.push({ op: 'add', title: a });
    else if (b.title !== a.title || b.isMain !== a.isMain) {
      diff.push({ op: 'update', language: lang, title: { title: a.title, isMain: a.isMain } });
    }
  }
  for (const [lang] of beforeMap) {
    if (!afterMap.has(lang)) diff.push({ op: 'remove', language: lang });
  }
  return diff;
}
