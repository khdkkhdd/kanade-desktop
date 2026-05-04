import { describe, it, expect } from 'vitest';
import { extractVideoIdFromHref, getCurrentVideoId } from './video-id.js';

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

describe('getCurrentVideoId', () => {
  it('reads ?v= from a watch URL', () => {
    const loc = { href: 'https://www.youtube.com/watch?v=ABCdefGHIJK' } as Location;
    expect(getCurrentVideoId(loc)).toBe('ABCdefGHIJK');
  });
  it('reads &v= when other params precede', () => {
    const loc = { href: 'https://www.youtube.com/watch?list=PL1&v=ABCdefGHIJK' } as Location;
    expect(getCurrentVideoId(loc)).toBe('ABCdefGHIJK');
  });
  it('returns null on non-watch page', () => {
    const loc = { href: 'https://www.youtube.com/' } as Location;
    expect(getCurrentVideoId(loc)).toBeNull();
  });
  it('returns null on shorts page (no ?v=)', () => {
    const loc = { href: 'https://www.youtube.com/shorts/ABCdefGHIJK' } as Location;
    expect(getCurrentVideoId(loc)).toBeNull();
  });
});
