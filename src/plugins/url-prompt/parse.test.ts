import { describe, it, expect } from 'vitest';
import { parseYouTubeInput } from './parse.js';

describe('parseYouTubeInput', () => {
  it('accepts bare 11-char video ID', () => {
    expect(parseYouTubeInput('dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('accepts IDs with dash and underscore', () => {
    expect(parseYouTubeInput('aB_cD-eFgHi'))
      .toBe('https://www.youtube.com/watch?v=aB_cD-eFgHi');
  });

  it('rejects too-short / too-long IDs', () => {
    expect(parseYouTubeInput('short')).toBeNull();
    expect(parseYouTubeInput('waytoolongvideoid123')).toBeNull();
  });

  it('rejects IDs with invalid chars', () => {
    expect(parseYouTubeInput('abcdefghij!')).toBeNull();
  });

  it('accepts canonical watch URL', () => {
    expect(parseYouTubeInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('preserves timestamp query on watch URL', () => {
    const out = parseYouTubeInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42');
    expect(out).toContain('v=dQw4w9WgXcQ');
    expect(out).toContain('t=42');
  });

  it('accepts youtu.be short URL', () => {
    expect(parseYouTubeInput('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('preserves timestamp on youtu.be', () => {
    const out = parseYouTubeInput('https://youtu.be/dQw4w9WgXcQ?t=30');
    expect(out).toContain('v=dQw4w9WgXcQ');
    expect(out).toContain('t=30');
  });

  it('canonicalises music.youtube.com to www.youtube.com', () => {
    expect(parseYouTubeInput('https://music.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('accepts shorts URL', () => {
    expect(parseYouTubeInput('https://www.youtube.com/shorts/dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/shorts/dQw4w9WgXcQ');
  });

  it('accepts URL without scheme', () => {
    expect(parseYouTubeInput('youtu.be/dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('trims leading/trailing whitespace', () => {
    expect(parseYouTubeInput('  dQw4w9WgXcQ  '))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('rejects non-YouTube hosts', () => {
    expect(parseYouTubeInput('https://vimeo.com/1234567')).toBeNull();
    expect(parseYouTubeInput('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  it('rejects empty / whitespace-only input', () => {
    expect(parseYouTubeInput('')).toBeNull();
    expect(parseYouTubeInput('   ')).toBeNull();
  });

  it('rejects watch URL with invalid v param', () => {
    expect(parseYouTubeInput('https://www.youtube.com/watch?v=short')).toBeNull();
  });

  it('rejects youtu.be with invalid path', () => {
    expect(parseYouTubeInput('https://youtu.be/short')).toBeNull();
  });
});
