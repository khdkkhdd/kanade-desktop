/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { collectOwnerChannels } from './owner-channels.js';

function makeDoc(html: string): Document {
  return new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`).window.document;
}

describe('collectOwnerChannels', () => {
  it('returns empty array when no owner anchors exist', () => {
    expect(collectOwnerChannels(makeDoc(''))).toEqual([]);
  });

  it('extracts a single channel from ytd-video-owner-renderer (/channel/UC…)', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="/channel/UCabcdefghijklmnopqrstuv">米津玄師</a>
      </ytd-video-owner-renderer>
    `);
    expect(collectOwnerChannels(doc)).toEqual([
      { ucId: 'UCabcdefghijklmnopqrstuv', name: '米津玄師' },
    ]);
  });

  it('returns ucId=null when only an /@handle anchor is present', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="/@yonezukenshi">米津玄師</a>
      </ytd-video-owner-renderer>
    `);
    expect(collectOwnerChannels(doc)).toEqual([
      { ucId: null, name: '米津玄師' },
    ]);
  });
});
