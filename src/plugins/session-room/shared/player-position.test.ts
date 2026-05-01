import { describe, it, expect } from 'vitest';
import { expectedHostPosition, computeDrift } from './player-position.js';

describe('expectedHostPosition', () => {
  it('returns 0 when no last state', () => {
    expect(expectedHostPosition(null, 1000)).toBe(0);
  });

  it('returns position as-is when paused', () => {
    expect(expectedHostPosition({ videoId: 'v', position: 60, isPlaying: false, isAd: false, ts: 1000 }, 5000)).toBe(60);
  });

  it('extrapolates when playing', () => {
    expect(expectedHostPosition({ videoId: 'v', position: 60, isPlaying: true, isAd: false, ts: 1000 }, 6000)).toBe(65);
  });

  it('handles ad: position frozen even if isPlaying true', () => {
    // isPlaying remains true during ad; we still extrapolate.
    // The next DRIFT_CHECK will correct guests backward as host's position freezes.
    expect(expectedHostPosition({ videoId: 'v', position: 60, isPlaying: true, isAd: true, ts: 1000 }, 6000)).toBe(65);
  });
});

describe('computeDrift', () => {
  it('positive drift means I am ahead of host', () => {
    expect(computeDrift({ videoId: 'v', position: 10, ts: 1000 }, 12, 2000)).toBeCloseTo(1);
  });

  it('negative drift means I am behind', () => {
    expect(computeDrift({ videoId: 'v', position: 10, ts: 1000 }, 10.5, 2000)).toBeCloseTo(-0.5);
  });
});
