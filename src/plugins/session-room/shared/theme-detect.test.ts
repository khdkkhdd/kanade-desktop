/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectYouTubeTheme, subscribeYouTubeTheme } from './theme-detect.js';

describe('theme-detect', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('dark');
  });
  afterEach(() => {
    document.documentElement.removeAttribute('dark');
  });

  it('returns "dark" when <html> has dark attribute', () => {
    document.documentElement.setAttribute('dark', '');
    expect(detectYouTubeTheme()).toBe('dark');
  });

  it('returns "light" when <html> has no dark attribute', () => {
    expect(detectYouTubeTheme()).toBe('light');
  });

  it('subscribe fires on attribute add and remove', async () => {
    const cb = vi.fn();
    const stop = subscribeYouTubeTheme(cb);

    document.documentElement.setAttribute('dark', '');
    await new Promise((r) => setTimeout(r, 0));
    expect(cb).toHaveBeenLastCalledWith('dark');

    document.documentElement.removeAttribute('dark');
    await new Promise((r) => setTimeout(r, 0));
    expect(cb).toHaveBeenLastCalledWith('light');

    stop();
  });

  it('subscribe stop() prevents further callbacks', async () => {
    const cb = vi.fn();
    const stop = subscribeYouTubeTheme(cb);
    stop();

    document.documentElement.setAttribute('dark', '');
    await new Promise((r) => setTimeout(r, 0));
    expect(cb).not.toHaveBeenCalled();
  });
});
