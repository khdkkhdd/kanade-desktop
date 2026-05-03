import { describe, it, expect } from 'vitest';
import { isYouTubeHost } from './is-youtube-host.js';

describe('isYouTubeHost', () => {
  it('accepts youtube.com', () => {
    expect(isYouTubeHost('youtube.com')).toBe(true);
  });

  it('accepts www.youtube.com', () => {
    expect(isYouTubeHost('www.youtube.com')).toBe(true);
  });

  it('accepts m.youtube.com', () => {
    expect(isYouTubeHost('m.youtube.com')).toBe(true);
  });

  it('accepts music.youtube.com', () => {
    expect(isYouTubeHost('music.youtube.com')).toBe(true);
  });

  it('accepts youtu.be', () => {
    expect(isYouTubeHost('youtu.be')).toBe(true);
  });

  it('rejects evilyoutube.com', () => {
    expect(isYouTubeHost('evilyoutube.com')).toBe(false);
  });

  it('rejects youtube.com.attacker.example', () => {
    expect(isYouTubeHost('youtube.com.attacker.example')).toBe(false);
  });

  it('rejects example.com', () => {
    expect(isYouTubeHost('example.com')).toBe(false);
  });
});
