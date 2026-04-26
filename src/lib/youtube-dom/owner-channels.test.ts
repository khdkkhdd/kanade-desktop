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

  it('returns multiple distinct channels in DOM order', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="/channel/UCaaaaaaaaaaaaaaaaaaaaaa">A</a>
        <a href="/channel/UCbbbbbbbbbbbbbbbbbbbbbb">B</a>
      </ytd-video-owner-renderer>
    `);
    expect(collectOwnerChannels(doc)).toEqual([
      { ucId: 'UCaaaaaaaaaaaaaaaaaaaaaa', name: 'A' },
      { ucId: 'UCbbbbbbbbbbbbbbbbbbbbbb', name: 'B' },
    ]);
  });

  it('dedupes anchors that share the same UC id (e.g. handle + channel link to same channel)', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="/channel/UCaaaaaaaaaaaaaaaaaaaaaa">米津玄師</a>
        <a href="/@yonezu">米津玄師</a>
        <a href="/channel/UCaaaaaaaaaaaaaaaaaaaaaa">米津玄師</a>
      </ytd-video-owner-renderer>
    `);
    expect(collectOwnerChannels(doc)).toEqual([
      { ucId: 'UCaaaaaaaaaaaaaaaaaaaaaa', name: '米津玄師' },
    ]);
  });

  it('dedupes by name when no UC ids are available', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="/@a">Alpha</a>
        <a href="/@a-mirror">Alpha</a>
      </ytd-video-owner-renderer>
    `);
    expect(collectOwnerChannels(doc)).toEqual([
      { ucId: null, name: 'Alpha' },
    ]);
  });

  it('falls back to #owner anchors when ytd-video-owner-renderer is empty', () => {
    const doc = makeDoc(`
      <div id="owner">
        <a href="/channel/UCcccccccccccccccccccccc">Cee</a>
      </div>
    `);
    expect(collectOwnerChannels(doc)).toEqual([
      { ucId: 'UCcccccccccccccccccccccc', name: 'Cee' },
    ]);
  });

  it('augments DOM-anchor result with movie_player.getVideoData().author when no anchors found', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="movie_player"></div></body></html>');
    const doc = dom.window.document;
    const player = doc.getElementById('movie_player') as HTMLElement & {
      getVideoData?: () => { author?: string };
    };
    player.getVideoData = () => ({ author: 'PlayerAuthor' });
    expect(collectOwnerChannels(doc)).toEqual([
      { ucId: null, name: 'PlayerAuthor' },
    ]);
  });

  it('does not add player author when DOM anchors already present', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <ytd-video-owner-renderer><a href="/channel/UCaaaaaaaaaaaaaaaaaaaaaa">A</a></ytd-video-owner-renderer>
      <div id="movie_player"></div>
    </body></html>`);
    const doc = dom.window.document;
    const player = doc.getElementById('movie_player') as HTMLElement & {
      getVideoData?: () => { author?: string };
    };
    player.getVideoData = () => ({ author: 'A-different-author' });
    expect(collectOwnerChannels(doc)).toEqual([
      { ucId: 'UCaaaaaaaaaaaaaaaaaaaaaa', name: 'A' },
    ]);
  });
});
