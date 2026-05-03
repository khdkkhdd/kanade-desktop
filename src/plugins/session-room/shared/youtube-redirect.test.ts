import { describe, it, expect } from 'vitest';
import { unwrapYouTubeRedirect } from './youtube-redirect.js';

describe('unwrapYouTubeRedirect', () => {
  it('unwraps a description redirect to its target', () => {
    const wrapped = 'https://www.youtube.com/redirect?event=video_description&q=https%3A%2F%2Ftwitter.com%2Fxeihare_&v=abc';
    expect(unwrapYouTubeRedirect(wrapped)).toBe('https://twitter.com/xeihare_');
  });

  it('unwraps an apex-host (youtube.com) redirect', () => {
    const wrapped = 'https://youtube.com/redirect?q=https%3A%2F%2Fexample.com%2F';
    expect(unwrapYouTubeRedirect(wrapped)).toBe('https://example.com/');
  });

  it('returns the original URL for a regular watch link', () => {
    const watch = 'https://www.youtube.com/watch?v=abc123';
    expect(unwrapYouTubeRedirect(watch)).toBe(watch);
  });

  it('returns the original URL for a non-YouTube host', () => {
    const ext = 'https://nicovideo.jp/watch/sm123';
    expect(unwrapYouTubeRedirect(ext)).toBe(ext);
  });

  it('returns the original URL when q parameter is missing', () => {
    const broken = 'https://www.youtube.com/redirect?event=video_description';
    expect(unwrapYouTubeRedirect(broken)).toBe(broken);
  });

  it('returns the original URL on malformed input', () => {
    expect(unwrapYouTubeRedirect('not a url')).toBe('not a url');
    expect(unwrapYouTubeRedirect('')).toBe('');
  });

  it('does not unwrap a /redirect path on a non-YouTube host', () => {
    const wrapped = 'https://evil.example/redirect?q=https%3A%2F%2Ftarget.com%2F';
    expect(unwrapYouTubeRedirect(wrapped)).toBe(wrapped);
  });
});
