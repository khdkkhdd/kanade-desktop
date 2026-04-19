import { describe, it, expect } from 'vitest';
import { sanitizeActivityText, padHangul } from '../utils.js';

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
