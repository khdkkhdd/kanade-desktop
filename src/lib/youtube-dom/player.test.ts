/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { getCurrentVideoDuration } from './player.js';

function makeDoc(html: string): Document {
  return new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`).window.document;
}

describe('getCurrentVideoDuration', () => {
  it('returns 0 when no <video> element exists', () => {
    expect(getCurrentVideoDuration(makeDoc(''))).toBe(0);
  });

  it('returns floor(duration) when <video> has a finite positive duration', () => {
    const doc = makeDoc('<video></video>');
    const v = doc.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(v, 'duration', { value: 213.7, configurable: true });
    expect(getCurrentVideoDuration(doc)).toBe(213);
  });

  it('returns 0 when duration is NaN', () => {
    const doc = makeDoc('<video></video>');
    const v = doc.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(v, 'duration', { value: NaN, configurable: true });
    expect(getCurrentVideoDuration(doc)).toBe(0);
  });

  it('returns 0 when duration is 0', () => {
    const doc = makeDoc('<video></video>');
    const v = doc.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(v, 'duration', { value: 0, configurable: true });
    expect(getCurrentVideoDuration(doc)).toBe(0);
  });

  it('returns 0 when duration is negative (defensive)', () => {
    const doc = makeDoc('<video></video>');
    const v = doc.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(v, 'duration', { value: -5, configurable: true });
    expect(getCurrentVideoDuration(doc)).toBe(0);
  });
});
