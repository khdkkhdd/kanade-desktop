import { describe, it, expect } from 'vitest';
import { sanitizeActivityText, padHangul, dedupeByArtistPublicId, isSeek } from '../utils.js';

describe('sanitizeActivityText', () => {
  it('returns text as-is when within 128 chars', () => {
    expect(sanitizeActivityText('hello')).toBe('hello');
  });

  it('truncates with ellipsis when exceeding 128 chars', () => {
    const long = 'a'.repeat(200);
    const result = sanitizeActivityText(long);
    expect(result.length).toBe(128);
    expect(result.endsWith('...')).toBe(true);
  });

  it('pads strings shorter than 2 chars with Hangul filler', () => {
    expect(sanitizeActivityText('a')).toBe('a\u3164');
  });

  it('returns fallback when input is empty or whitespace', () => {
    expect(sanitizeActivityText('', 'YouTube')).toBe('YouTube');
    expect(sanitizeActivityText('   ', 'YouTube')).toBe('YouTube');
    expect(sanitizeActivityText(undefined, 'YouTube')).toBe('YouTube');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeActivityText('  hello  ')).toBe('hello');
  });
});

describe('padHangul', () => {
  it('pads 1-char strings to 2 chars with Hangul filler', () => {
    expect(padHangul('갑')).toBe('갑\u3164');
  });

  it('returns 2-char+ strings unchanged', () => {
    expect(padHangul('갑을')).toBe('갑을');
    expect(padHangul('hello')).toBe('hello');
  });

  it('returns empty string unchanged', () => {
    expect(padHangul('')).toBe('');
  });
});

describe('dedupeByArtistPublicId', () => {
  it('merges duplicate artistPublicIds keeping first position', () => {
    const input = [
      { artistPublicId: 'a_aaaaaaaaaa', name: 'A', isPublic: true },
      { artistPublicId: 'b_bbbbbbbbbb', name: 'B', isPublic: false },
      { artistPublicId: 'a_aaaaaaaaaa', name: 'A', isPublic: false },
    ];
    const result = dedupeByArtistPublicId(input);
    expect(result).toEqual([
      { artistPublicId: 'a_aaaaaaaaaa', name: 'A', isPublic: true },
      { artistPublicId: 'b_bbbbbbbbbb', name: 'B', isPublic: false },
    ]);
  });

  it('ORs isPublic across duplicate occurrences', () => {
    const input = [
      { artistPublicId: 'a_aaaaaaaaaa', name: 'A', isPublic: false },
      { artistPublicId: 'a_aaaaaaaaaa', name: 'A', isPublic: true },
    ];
    const result = dedupeByArtistPublicId(input);
    expect(result[0].isPublic).toBe(true);
  });

  it('handles empty input', () => {
    expect(dedupeByArtistPublicId([])).toEqual([]);
  });
});

describe('isSeek', () => {
  it('returns true when |Δ| > 2s', () => {
    expect(isSeek(10, 20)).toBe(true);
    expect(isSeek(20, 10)).toBe(true);
  });

  it('returns false when |Δ| ≤ 2s', () => {
    expect(isSeek(10, 12)).toBe(false);
    expect(isSeek(10, 10)).toBe(false);
    expect(isSeek(10, 8)).toBe(false);
  });
});
