/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { observeAdState } from './ad-detector.js';

describe('observeAdState', () => {
  it('reports false initially when .ad-showing is absent', () => {
    document.body.innerHTML = '<div id="movie_player"></div>';
    const cb = vi.fn();
    const stop = observeAdState(cb);
    expect(cb).toHaveBeenCalledWith(false);
    stop();
  });

  it('reports true when class is added, false when removed', async () => {
    document.body.innerHTML = '<div id="movie_player"></div>';
    const player = document.getElementById('movie_player')!;
    const cb = vi.fn();
    const stop = observeAdState(cb);
    cb.mockClear();

    player.classList.add('ad-showing');
    await new Promise((r) => setTimeout(r, 50));
    expect(cb).toHaveBeenCalledWith(true);

    player.classList.remove('ad-showing');
    await new Promise((r) => setTimeout(r, 50));
    expect(cb).toHaveBeenCalledWith(false);

    stop();
  });
});
