import { describe, it, expect } from 'vitest';
import { shouldShowFrom } from './chat-grouping.js';

describe('shouldShowFrom', () => {
  it('first message always shows from', () => {
    expect(shouldShowFrom(undefined, 'a')).toBe(true);
  });

  it('different sender shows from', () => {
    expect(shouldShowFrom('a', 'b')).toBe(true);
  });

  it('same sender suppresses from', () => {
    expect(shouldShowFrom('a', 'a')).toBe(false);
  });
});
