import type { ArtistCreditInput, NewArtistInput } from '../../admin/types.js';

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

export interface ArtistCreditSnapshot {
  artistId: number;
  role: string | null;
  isPublic: boolean;
}

type Credit = ArtistCreditInput | { newArtist: NewArtistInput; role: string | null; isPublic: boolean };

export type ArtistDiff =
  | { op: 'add'; artistId: number; role: string | null; isPublic: boolean }
  | { op: 'add-new'; newArtist: NewArtistInput; role: string | null; isPublic: boolean }
  | { op: 'update'; artistId: number; role: string | null; isPublic: boolean }
  | { op: 'remove'; artistId: number; role: string | null };

// Credits are identified in the DB by the composite (artistId, role) — the
// same artist can legitimately hold two credits with different roles on one
// work/recording. Keying the diff by artistId alone would collapse those and
// make role changes impossible to express, so encode role (including null)
// into the key.
function creditKey(c: { artistId: number; role: string | null }): string {
  return `${c.artistId}\u0000${c.role === null ? '__NULL__' : `:${c.role}`}`;
}

export function computeArtistDiff(
  before: ArtistCreditSnapshot[],
  after: Credit[],
): ArtistDiff[] {
  const diff: ArtistDiff[] = [];
  const beforeMap = new Map(before.map((c) => [creditKey(c), c]));
  const afterKeys = new Set<string>();

  for (const a of after) {
    if ('newArtist' in a) {
      diff.push({ op: 'add-new', newArtist: a.newArtist, role: a.role, isPublic: a.isPublic });
      continue;
    }
    const key = creditKey(a);
    afterKeys.add(key);
    const b = beforeMap.get(key);
    if (!b) {
      // Same artistId with a different role is considered a new credit —
      // role changes surface as remove(old) + add(new) rather than an
      // update in place, because the server endpoint treats (artistId, role)
      // as the row identity.
      diff.push({ op: 'add', artistId: a.artistId, role: a.role, isPublic: a.isPublic });
    } else if (b.isPublic !== a.isPublic) {
      diff.push({ op: 'update', artistId: a.artistId, role: a.role, isPublic: a.isPublic });
    }
  }
  for (const [key, b] of beforeMap) {
    if (!afterKeys.has(key)) diff.push({ op: 'remove', artistId: b.artistId, role: b.role });
  }
  return diff;
}
