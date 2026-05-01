import { describe, it, expect } from 'vitest';
import { canAddSong } from './rate-limit.js';

describe('canAddSong', () => {
  it('allows when no previous add', () => {
    expect(canAddSong(0, 1000).ok).toBe(true);
  });

  it('rejects when within window and reports remaining', () => {
    const r = canAddSong(1000, 3000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.remainingMs).toBe(3000);  // 5000 - 2000
  });

  it('allows exactly at window edge', () => {
    expect(canAddSong(1000, 6000).ok).toBe(true);
  });

  it('allows past window', () => {
    expect(canAddSong(1000, 7000).ok).toBe(true);
  });
});
