import { describe, it, expect, vi, beforeEach } from 'vitest';
import { warnOnce, _resetWarnedForTesting } from './_warn.js';

describe('warnOnce', () => {
  beforeEach(() => {
    _resetWarnedForTesting();
  });

  it('writes to console.warn once for a given key', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnOnce('keyA', 'message A');
    warnOnce('keyA', 'message A again');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain('message A');
    spy.mockRestore();
  });

  it('writes separately for different keys', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnOnce('keyA', 'message A');
    warnOnce('keyB', 'message B');
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('prefixes message with [kanade/yt-dom]', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnOnce('keyC', 'something broken');
    expect(spy.mock.calls[0][0]).toMatch(/^\[kanade\/yt-dom\]/);
    spy.mockRestore();
  });
});
