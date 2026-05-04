import { describe, it, expect } from 'vitest';
import { YT_REGEX } from './patterns.js';

describe('YT_REGEX.videoIdInUrl', () => {
  it('extracts id from watch URL', () => {
    expect('https://www.youtube.com/watch?v=ABCdefGHIJK'.match(YT_REGEX.videoIdInUrl)?.[1])
      .toBe('ABCdefGHIJK');
  });
  it('extracts id from shorts URL', () => {
    expect('https://www.youtube.com/shorts/ABCdefGHIJK'.match(YT_REGEX.videoIdInUrl)?.[1])
      .toBe('ABCdefGHIJK');
  });
  it('does not match non-video URL', () => {
    expect('https://www.youtube.com/c/SomeChannel'.match(YT_REGEX.videoIdInUrl)).toBeNull();
  });
});

describe('YT_REGEX.videoIdInWatchQuery', () => {
  it('matches ?v= prefix', () => {
    expect('?v=ABCdefGHIJK'.match(YT_REGEX.videoIdInWatchQuery)?.[1]).toBe('ABCdefGHIJK');
  });
  it('matches &v= prefix', () => {
    expect('?foo=bar&v=ABCdefGHIJK'.match(YT_REGEX.videoIdInWatchQuery)?.[1]).toBe('ABCdefGHIJK');
  });
  it('does not match without v=', () => {
    expect('?foo=bar'.match(YT_REGEX.videoIdInWatchQuery)).toBeNull();
  });
});
