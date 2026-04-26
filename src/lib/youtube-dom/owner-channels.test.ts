/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { collectOwnerChannels, extractOwnerLabel } from './owner-channels.js';

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

  it('matches anchors with absolute URLs (href contains /channel/UC…)', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="https://www.youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa">A</a>
      </ytd-video-owner-renderer>
    `);
    expect(collectOwnerChannels(doc)).toEqual([
      { ucId: 'UCaaaaaaaaaaaaaaaaaaaaaa', name: 'A' },
    ]);
  });

  it('extracts UC ids from description-body @handle anchors and trims leading slashes', () => {
    const doc = makeDoc(`
      <ytd-expandable-video-description-body-renderer>
        <span>
          <a href="/channel/UCYRSuz5cmJeSNnGB7jedITg">/ @marumochi_official</a>
          <a href="/channel/UC3ql_EU4JnaE3Rh3cqbHu6g">/ @kotoha_ktnh</a>
        </span>
      </ytd-expandable-video-description-body-renderer>
    `);
    expect(collectOwnerChannels(doc)).toEqual([
      { ucId: 'UCYRSuz5cmJeSNnGB7jedITg', name: '@marumochi_official' },
      { ucId: 'UC3ql_EU4JnaE3Rh3cqbHu6g', name: '@kotoha_ktnh' },
    ]);
  });

  it('skips anchors inside button-view-model (structured-description meta buttons)', () => {
    const doc = makeDoc(`
      <ytd-expandable-video-description-body-renderer>
        <a href="/channel/UC3ql_EU4JnaE3Rh3cqbHu6g">@kotoha_ktnh</a>
      </ytd-expandable-video-description-body-renderer>
      <div id="structured-description">
        <button-view-model>
          <a href="/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ">음악</a>
        </button-view-model>
        <button-view-model>
          <a href="/channel/UC3ql_EU4JnaE3Rh3cqbHu6g/videos">동영상</a>
        </button-view-model>
      </div>
    `);
    expect(collectOwnerChannels(doc)).toEqual([
      { ucId: 'UC3ql_EU4JnaE3Rh3cqbHu6g', name: '@kotoha_ktnh' },
    ]);
  });

  it('combines owner area and description body, deduping by UC', () => {
    const doc = makeDoc(`
      <ytd-video-owner-renderer>
        <a href="/channel/UCYRSuz5cmJeSNnGB7jedITg">marumochi</a>
      </ytd-video-owner-renderer>
      <ytd-expandable-video-description-body-renderer>
        <a href="/channel/UCYRSuz5cmJeSNnGB7jedITg">/ @marumochi_official</a>
        <a href="/channel/UC3ql_EU4JnaE3Rh3cqbHu6g">/ @kotoha_ktnh</a>
      </ytd-expandable-video-description-body-renderer>
    `);
    expect(collectOwnerChannels(doc)).toEqual([
      { ucId: 'UCYRSuz5cmJeSNnGB7jedITg', name: 'marumochi' },
      { ucId: 'UC3ql_EU4JnaE3Rh3cqbHu6g', name: '@kotoha_ktnh' },
    ]);
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
