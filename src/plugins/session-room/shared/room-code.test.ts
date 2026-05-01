import { describe, it, expect } from 'vitest';
import { generateRoomCode, isValidRoomCode } from './room-code.js';

describe('generateRoomCode', () => {
  it('returns a 6-char string from the room alphabet', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(/^[0-9a-z]{6}$/.test(code)).toBe(true);
  });

  it('returns different codes on successive calls', () => {
    const a = generateRoomCode();
    const b = generateRoomCode();
    expect(a).not.toBe(b);
  });
});

describe('isValidRoomCode', () => {
  it('accepts valid 6-char lowercase alphanumeric codes', () => {
    expect(isValidRoomCode('k7m3xq')).toBe(true);
    expect(isValidRoomCode('000000')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidRoomCode('k7m3x')).toBe(false);
    expect(isValidRoomCode('k7m3xqq')).toBe(false);
    expect(isValidRoomCode('')).toBe(false);
  });

  it('rejects uppercase / special chars', () => {
    expect(isValidRoomCode('K7M3XQ')).toBe(false);
    expect(isValidRoomCode('k7m3x!')).toBe(false);
    expect(isValidRoomCode('k7m3x ')).toBe(false);
  });
});
