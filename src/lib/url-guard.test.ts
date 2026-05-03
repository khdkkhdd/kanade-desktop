import { describe, it, expect } from 'vitest';
import { isSafeWebUrl, isSafeYouTubeUrl } from './url-guard.js';

describe('isSafeWebUrl', () => {
  it('accepts external https hosts', () => {
    expect(isSafeWebUrl('https://www.youtube.com')).toBe(true);
    expect(isSafeWebUrl('https://music.youtube.com/watch?v=abc')).toBe(true);
    expect(isSafeWebUrl('https://www.nicovideo.jp/watch/sm123')).toBe(true);
  });

  it('accepts external http hosts', () => {
    expect(isSafeWebUrl('http://example.com/path')).toBe(true);
  });

  it('rejects empty/null/undefined', () => {
    expect(isSafeWebUrl(undefined)).toBe(false);
    expect(isSafeWebUrl(null)).toBe(false);
    expect(isSafeWebUrl('')).toBe(false);
  });

  it('rejects non-http(s) protocols', () => {
    expect(isSafeWebUrl('file:///foo/bar.html')).toBe(false);
    expect(isSafeWebUrl('chrome://settings')).toBe(false);
    expect(isSafeWebUrl('data:text/html,<h1>hi</h1>')).toBe(false);
  });

  it('rejects loopback hosts (dev settings/admin windows)', () => {
    expect(isSafeWebUrl('http://localhost:5173/settings-window/index.html')).toBe(false);
    expect(isSafeWebUrl('https://localhost/x')).toBe(false);
    expect(isSafeWebUrl('http://127.0.0.1:8080')).toBe(false);
    expect(isSafeWebUrl('http://[::1]:9000')).toBe(false);
  });

  it('rejects malformed urls', () => {
    expect(isSafeWebUrl('http://')).toBe(false);
    expect(isSafeWebUrl('not a url')).toBe(false);
  });
});

describe('isSafeYouTubeUrl', () => {
  it('accepts youtube.com and subdomains', () => {
    expect(isSafeYouTubeUrl('https://youtube.com/')).toBe(true);
    expect(isSafeYouTubeUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isSafeYouTubeUrl('https://m.youtube.com/')).toBe(true);
    expect(isSafeYouTubeUrl('https://music.youtube.com/playlist')).toBe(true);
  });

  it('accepts youtu.be shortener', () => {
    expect(isSafeYouTubeUrl('https://youtu.be/abc123')).toBe(true);
  });

  it('rejects non-YouTube external sites', () => {
    expect(isSafeYouTubeUrl('https://www.nicovideo.jp/watch/sm123')).toBe(false);
    expect(isSafeYouTubeUrl('https://example.com/')).toBe(false);
  });

  it('rejects YouTube lookalikes', () => {
    expect(isSafeYouTubeUrl('https://evilyoutube.com/')).toBe(false);
    expect(isSafeYouTubeUrl('https://youtube.com.attacker.example/')).toBe(false);
  });

  it('inherits all isSafeWebUrl rejections', () => {
    expect(isSafeYouTubeUrl(undefined)).toBe(false);
    expect(isSafeYouTubeUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeYouTubeUrl('http://localhost:5173/')).toBe(false);
  });
});
