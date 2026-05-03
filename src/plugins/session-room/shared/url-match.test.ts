import { describe, it, expect } from 'vitest';
import { urlsMatchAsSync } from './url-match.js';

describe('urlsMatchAsSync', () => {
  it('matches when v param is identical and extra params differ', () => {
    expect(
      urlsMatchAsSync(
        'https://www.youtube.com/watch?v=abc123',
        'https://www.youtube.com/watch?v=abc123&pp=xyz&si=foo',
      ),
    ).toBe(true);
  });

  it('mismatches when v param differs', () => {
    expect(
      urlsMatchAsSync(
        'https://www.youtube.com/watch?v=abc123',
        'https://www.youtube.com/watch?v=zzz999',
      ),
    ).toBe(false);
  });

  it('matches trailing-slash variant (same pathname after normalisation)', () => {
    // new URL normalises both to pathname "/" — trailing slash on root is canonical
    expect(
      urlsMatchAsSync(
        'https://www.youtube.com/?v=abc123',
        'https://www.youtube.com?v=abc123',
      ),
    ).toBe(true);
  });

  it('mismatches http vs https (different protocol)', () => {
    expect(
      urlsMatchAsSync(
        'http://www.youtube.com/watch?v=abc123',
        'https://www.youtube.com/watch?v=abc123',
      ),
    ).toBe(false);
  });

  it('mismatches different pathname even when v param matches', () => {
    expect(
      urlsMatchAsSync(
        'https://www.youtube.com/watch?v=abc123',
        'https://www.youtube.com/shorts/abc123',
      ),
    ).toBe(false);
  });

  it('falls back to strict string equality for malformed URLs (both malformed and equal)', () => {
    expect(urlsMatchAsSync('not-a-url', 'not-a-url')).toBe(true);
  });

  it('falls back to strict string equality for malformed URLs (both malformed and different)', () => {
    expect(urlsMatchAsSync('not-a-url', 'other-garbage')).toBe(false);
  });
});
