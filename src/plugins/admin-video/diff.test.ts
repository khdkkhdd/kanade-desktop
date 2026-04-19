import { describe, it, expect } from 'vitest';
import { computeTitleDiff, computeArtistDiff, type TitleSnapshot, type ArtistCreditSnapshot } from './diff.js';

describe('computeTitleDiff', () => {
  const before: TitleSnapshot[] = [
    { language: 'ja', title: '千本桜', isMain: true },
    { language: 'en', title: 'Senbonzakura', isMain: false },
  ];

  it('detects no change when identical', () => {
    expect(computeTitleDiff(before, before)).toEqual([]);
  });

  it('detects added language', () => {
    const after = [...before, { language: 'ko', title: '천본벚꽃', isMain: false }];
    expect(computeTitleDiff(before, after)).toEqual([
      { op: 'add', title: { language: 'ko', title: '천본벚꽃', isMain: false } },
    ]);
  });

  it('detects removed language', () => {
    const after = before.slice(0, 1);
    expect(computeTitleDiff(before, after)).toEqual([{ op: 'remove', language: 'en' }]);
  });

  it('detects text edit on existing language', () => {
    const after = [{ language: 'ja', title: '千本櫻', isMain: true }, before[1]];
    expect(computeTitleDiff(before, after)).toEqual([
      { op: 'update', language: 'ja', title: { title: '千本櫻', isMain: true } },
    ]);
  });

  it('detects isMain switch', () => {
    const after = [
      { language: 'ja', title: '千本桜', isMain: false },
      { language: 'en', title: 'Senbonzakura', isMain: true },
    ];
    const diff = computeTitleDiff(before, after);
    expect(diff.some((d) => d.op === 'update')).toBe(true);
  });
});

describe('computeArtistDiff', () => {
  const before: ArtistCreditSnapshot[] = [
    { artistId: 1, role: 'vocal', isPublic: true },
    { artistId: 2, role: 'composer', isPublic: true },
  ];

  it('no change when identical', () => {
    expect(computeArtistDiff(before, before)).toEqual([]);
  });

  it('add new credit', () => {
    const after = [...before, { artistId: 3, role: 'arranger', isPublic: true }];
    expect(computeArtistDiff(before, after)).toEqual([
      { op: 'add', artistId: 3, role: 'arranger', isPublic: true },
    ]);
  });

  it('remove carries role for server identity', () => {
    const after = [before[0]];
    expect(computeArtistDiff(before, after)).toEqual([
      { op: 'remove', artistId: 2, role: 'composer' },
    ]);
  });

  it('role change emits remove(old) + add(new), not update', () => {
    const after = [{ artistId: 1, role: 'guitar', isPublic: true }, before[1]];
    const diff = computeArtistDiff(before, after);
    expect(diff).toContainEqual({ op: 'add', artistId: 1, role: 'guitar', isPublic: true });
    expect(diff).toContainEqual({ op: 'remove', artistId: 1, role: 'vocal' });
    expect(diff.some((d) => d.op === 'update')).toBe(false);
  });

  it('isPublic toggle with same role emits update', () => {
    const after = [{ ...before[0], isPublic: false }, before[1]];
    expect(computeArtistDiff(before, after)).toEqual([
      { op: 'update', artistId: 1, role: 'vocal', isPublic: false },
    ]);
  });

  it('same artist with two different roles stays distinct (no collapse)', () => {
    const beforeTwoRoles: ArtistCreditSnapshot[] = [
      { artistId: 1, role: 'vocal', isPublic: true },
      { artistId: 1, role: 'composer', isPublic: true },
    ];
    const afterOneGone = [beforeTwoRoles[0]];
    expect(computeArtistDiff(beforeTwoRoles, afterOneGone)).toEqual([
      { op: 'remove', artistId: 1, role: 'composer' },
    ]);
  });

  it('null role is distinct from role=""', () => {
    const b: ArtistCreditSnapshot[] = [{ artistId: 1, role: null, isPublic: true }];
    const a = [{ artistId: 1, role: '', isPublic: true }];
    const diff = computeArtistDiff(b, a);
    expect(diff).toContainEqual({ op: 'add', artistId: 1, role: '', isPublic: true });
    expect(diff).toContainEqual({ op: 'remove', artistId: 1, role: null });
  });
});
