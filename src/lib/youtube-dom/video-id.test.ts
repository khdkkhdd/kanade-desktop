import { describe, it, expect } from 'vitest';
import { extractVideoIdFromHref } from './video-id.js';

describe('extractVideoIdFromHref', () => {
  it('reads watch URL', () => {
    expect(extractVideoIdFromHref('https://www.youtube.com/watch?v=ABCdefGHIJK')).toBe('ABCdefGHIJK');
  });
  it('reads shorts URL', () => {
    expect(extractVideoIdFromHref('https://www.youtube.com/shorts/ABCdefGHIJK')).toBe('ABCdefGHIJK');
  });
  it('returns null for non-video URL', () => {
    expect(extractVideoIdFromHref('https://www.youtube.com/c/Channel')).toBeNull();
  });
  it('returns null for non-youtube URL', () => {
    expect(extractVideoIdFromHref('https://www.nicovideo.jp/watch/sm123')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(extractVideoIdFromHref('')).toBeNull();
  });
});
