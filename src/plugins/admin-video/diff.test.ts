import { describe, it, expect } from 'vitest';
import { computeTitleDiff, type TitleSnapshot } from './diff.js';

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
