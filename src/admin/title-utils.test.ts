import { describe, it, expect } from 'vitest';
import { normalizeTitles } from './title-utils.js';

describe('normalizeTitles', () => {
  it('returns empty array for empty input', () => {
    expect(normalizeTitles([])).toEqual([]);
  });

  it('trims leading and trailing whitespace', () => {
    expect(
      normalizeTitles([{ title: '  千本桜  ', language: 'ja', isMain: true }]),
    ).toEqual([{ title: '千本桜', language: 'ja', isMain: true }]);
  });

  it('drops entries that become empty after trimming', () => {
    expect(
      normalizeTitles([
        { title: '   ', language: 'ja', isMain: true },
        { title: '곡명', language: 'ko', isMain: false },
      ]),
    ).toEqual([{ title: '곡명', language: 'ko', isMain: true }]);
  });

  it('returns empty when every entry is whitespace-only', () => {
    expect(
      normalizeTitles([
        { title: '', language: 'ja', isMain: true },
        { title: '   ', language: 'ko', isMain: false },
      ]),
    ).toEqual([]);
  });

  it('promotes the first row to isMain when no flag survives', () => {
    expect(
      normalizeTitles([
        { title: 'song', language: 'en', isMain: false },
        { title: '曲名', language: 'ja', isMain: false },
      ]),
    ).toEqual([
      { title: 'song', language: 'en', isMain: true },
      { title: '曲名', language: 'ja', isMain: false },
    ]);
  });

  it('keeps a surviving isMain row flagged', () => {
    expect(
      normalizeTitles([
        { title: 'song', language: 'en', isMain: false },
        { title: '曲名', language: 'ja', isMain: true },
      ]),
    ).toEqual([
      { title: 'song', language: 'en', isMain: false },
      { title: '曲名', language: 'ja', isMain: true },
    ]);
  });

  it('collapses multiple isMain flags to just the first', () => {
    expect(
      normalizeTitles([
        { title: 'a', language: 'ja', isMain: true },
        { title: 'b', language: 'en', isMain: true },
      ]),
    ).toEqual([
      { title: 'a', language: 'ja', isMain: true },
      { title: 'b', language: 'en', isMain: false },
    ]);
  });

  it('does not mutate the input array', () => {
    const input: ReturnType<typeof normalizeTitles> = [
      { title: '  a  ', language: 'ja', isMain: true },
    ];
    const snapshot = JSON.parse(JSON.stringify(input));
    normalizeTitles(input);
    expect(input).toEqual(snapshot);
  });
});
