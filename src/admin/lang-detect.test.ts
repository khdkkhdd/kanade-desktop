import { describe, it, expect } from 'vitest';
import { detectLanguage } from './lang-detect.js';

describe('detectLanguage', () => {
  it('returns ja for hiragana', () => {
    expect(detectLanguage('ひらがな')).toBe('ja');
  });
  it('returns ja for katakana', () => {
    expect(detectLanguage('ミク')).toBe('ja');
  });
  it('returns ja for CJK ideographs', () => {
    expect(detectLanguage('千本桜')).toBe('ja');
  });
  it('returns ko for hangul', () => {
    expect(detectLanguage('아도')).toBe('ko');
  });
  it('returns en for latin', () => {
    expect(detectLanguage('Ado')).toBe('en');
  });
  it('returns en for mixed latin and digits', () => {
    expect(detectLanguage('Mrs GREEN APPLE 2024')).toBe('en');
  });
  it('prefers hangul over latin when mixed', () => {
    expect(detectLanguage('Ado 아도')).toBe('ko');
  });
  it('returns en for empty string', () => {
    expect(detectLanguage('')).toBe('en');
  });
});
