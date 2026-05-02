import { describe, it, expect } from 'vitest';
import { extractVideoIdFromCard, isYouTubeVideoLink } from './add-to-queue-button.js';

describe('extractVideoIdFromCard', () => {
  it('reads watch URL', () => {
    expect(extractVideoIdFromCard('https://www.youtube.com/watch?v=ABCdefGHIJK')).toBe('ABCdefGHIJK');
  });
  it('reads shorts', () => {
    expect(extractVideoIdFromCard('https://www.youtube.com/shorts/ABCdefGHIJK')).toBe('ABCdefGHIJK');
  });
  it('rejects invalid', () => {
    expect(extractVideoIdFromCard('https://youtube.com/c/Channel')).toBeNull();
  });
});

describe('isYouTubeVideoLink', () => {
  it('youtube.com/watch — true', () => {
    expect(isYouTubeVideoLink('https://www.youtube.com/watch?v=ABCdefGHIJK')).toBe(true);
  });
  it('niconico — false', () => {
    expect(isYouTubeVideoLink('https://www.nicovideo.jp/watch/sm123')).toBe(false);
  });
  it('youtube.com/c/foo — false', () => {
    expect(isYouTubeVideoLink('https://youtube.com/c/foo')).toBe(false);
  });
});
