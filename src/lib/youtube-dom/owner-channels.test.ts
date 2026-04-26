/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractOwnerLabel, findOwnerChannelUc } from './owner-channels.js';

function makeDoc(html: string): Document {
  return new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`).window.document;
}

describe('findOwnerChannelUc', () => {
  it('returns null when owner area has no /channel/ href', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="javascript:void(0)">Multi-creator label</a>
      </ytd-video-owner-renderer>
    `);
    expect(findOwnerChannelUc(doc)).toBeNull();
  });

  it('extracts UC from a relative /channel/UC… href', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="/channel/UCabcdefghijklmnopqrstuv">米津玄師</a>
      </ytd-video-owner-renderer>
    `);
    expect(findOwnerChannelUc(doc)).toBe('UCabcdefghijklmnopqrstuv');
  });

  it('extracts UC from an absolute URL', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv">米津玄師</a>
      </ytd-video-owner-renderer>
    `);
    expect(findOwnerChannelUc(doc)).toBe('UCabcdefghijklmnopqrstuv');
  });

  it('falls back to #owner anchors when ytd-video-owner-renderer is empty', () => {
    const doc = makeDoc(`
      <div id="owner">
        <a href="/channel/UCcccccccccccccccccccccc">Cee</a>
      </div>
    `);
    expect(findOwnerChannelUc(doc)).toBe('UCcccccccccccccccccccccc');
  });

  it('returns null when no owner anchors exist', () => {
    expect(findOwnerChannelUc(makeDoc(''))).toBeNull();
  });
});

describe('extractOwnerLabel', () => {
  it('returns null when owner area is empty', () => {
    expect(extractOwnerLabel(makeDoc(''))).toBeNull();
  });

  it('returns the single anchor textContent when owner area has one labelled anchor', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="/channel/UCabcdefghijklmnopqrstuv">米津玄師</a>
      </ytd-video-owner-renderer>
    `);
    expect(extractOwnerLabel(doc)).toBe('米津玄師');
  });

  it('returns the multi-creator label even when the anchor href is javascript:void(0)', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="" tabindex="-1"></a>
        <a href="javascript:void(0)">Kotoha 및 星川サラ / Sara Hoshikawa</a>
      </ytd-video-owner-renderer>
    `);
    expect(extractOwnerLabel(doc)).toBe('Kotoha 및 星川サラ / Sara Hoshikawa');
  });

  it('joins multiple text-bearing anchors with ", "', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="/channel/UCa">A</a>
        <a href="/channel/UCb">B</a>
      </ytd-video-owner-renderer>
    `);
    expect(extractOwnerLabel(doc)).toBe('A, B');
  });

  it('ignores anchors with empty textContent', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="/channel/UCa"></a>
        <a href="/channel/UCa">米津玄師</a>
      </ytd-video-owner-renderer>
    `);
    expect(extractOwnerLabel(doc)).toBe('米津玄師');
  });
});
