import { describe, it, expect } from 'vitest';
import { formatWithOriginal } from './title-utils.js';

describe('formatWithOriginal', () => {
  it('returns "displayed (original)" when both differ', () => {
    expect(formatWithOriginal('기라기라', 'ギラギラ')).toBe('기라기라 (ギラギラ)');
  });

  it('returns single text when displayed === original', () => {
    expect(formatWithOriginal('Lemon', 'Lemon')).toBe('Lemon');
  });

  it('returns displayed when original is empty string', () => {
    expect(formatWithOriginal('A', '')).toBe('A');
  });

  it('returns displayed when original is null', () => {
    expect(formatWithOriginal('A', null)).toBe('A');
  });

  it('returns displayed when original is undefined', () => {
    expect(formatWithOriginal('A', undefined)).toBe('A');
  });
});
