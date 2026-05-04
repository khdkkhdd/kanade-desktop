/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { isThumbnailAnchor, isWrapperAnchor, findCardHosts } from './cards.js';
import { _resetWarnedForTesting } from './_warn.js';

function makeDoc(html: string): Document {
  return new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`).window.document;
}

describe('isThumbnailAnchor', () => {
  it('true when anchor wraps a plain <img>', () => {
    const doc = makeDoc('<a href="/watch?v=X"><img src="thumb.jpg"></a>');
    const a = doc.querySelector('a') as HTMLAnchorElement;
    expect(isThumbnailAnchor(a)).toBe(true);
  });
  it('true when anchor wraps a <yt-image>', () => {
    const doc = makeDoc('<a href="/watch?v=X"><yt-image></yt-image></a>');
    const a = doc.querySelector('a') as HTMLAnchorElement;
    expect(isThumbnailAnchor(a)).toBe(true);
  });
  it('true when anchor wraps a <yt-thumbnail-view-model>', () => {
    const doc = makeDoc('<a href="/watch?v=X"><yt-thumbnail-view-model></yt-thumbnail-view-model></a>');
    const a = doc.querySelector('a') as HTMLAnchorElement;
    expect(isThumbnailAnchor(a)).toBe(true);
  });
  it('false when anchor wraps only text (title-only anchor)', () => {
    const doc = makeDoc('<a href="/watch?v=X">Some video title</a>');
    const a = doc.querySelector('a') as HTMLAnchorElement;
    expect(isThumbnailAnchor(a)).toBe(false);
  });
  it('false when anchor is empty', () => {
    const doc = makeDoc('<a href="/watch?v=X"></a>');
    const a = doc.querySelector('a') as HTMLAnchorElement;
    expect(isThumbnailAnchor(a)).toBe(false);
  });
});

describe('isWrapperAnchor', () => {
  it('true when anchor contains a nested anchor (card-wide wrapper)', () => {
    // Mix sidebar (ytd-playlist-panel-video-renderer) builds programmatically
    // a #wc-endpoint outer wrapping a #thumbnail inner. HTML parser disallows
    // <a><a></a></a>, so we build the fixture via DOM API.
    const doc = makeDoc('');
    const outer = doc.createElement('a');
    outer.href = '/watch?v=X';
    const inner = doc.createElement('a');
    inner.href = '/watch?v=X';
    inner.appendChild(doc.createElement('yt-image'));
    outer.appendChild(inner);
    doc.body.appendChild(outer);
    expect(isWrapperAnchor(outer)).toBe(true);
  });
  it('false for an anchor without nested anchors', () => {
    const doc = makeDoc('<a href="/watch?v=X"><img></a>');
    const a = doc.querySelector('a') as HTMLAnchorElement;
    expect(isWrapperAnchor(a)).toBe(false);
  });
  it('false for an empty anchor', () => {
    const doc = makeDoc('<a href="/watch?v=X"></a>');
    const a = doc.querySelector('a') as HTMLAnchorElement;
    expect(isWrapperAnchor(a)).toBe(false);
  });
});

describe('findCardHosts', () => {
  beforeEach(() => {
    _resetWarnedForTesting();
  });

  function names(els: Element[]): string[] {
    return els.map((e) => e.tagName.toLowerCase());
  }

  it('returns ytd-rich-item-renderer for homepage grid (skips display:contents lockup)', () => {
    const doc = makeDoc(`
      <ytd-rich-grid-row>
        <ytd-rich-item-renderer>
          <yt-lockup-view-model style="display: contents">
            <div class="parent">
              <a href="/watch?v=X"><img></a>
            </div>
          </yt-lockup-view-model>
        </ytd-rich-item-renderer>
      </ytd-rich-grid-row>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    expect(names(findCardHosts(parent, doc.defaultView as Window)))
      .toEqual(['ytd-rich-item-renderer']);
  });

  it('returns ytd-video-renderer for search through Polymer slot divs', () => {
    // Real search has div#contents Polymer slots between custom-element
    // ancestors. Allowlist-based climb walks past all non-card customs
    // (ytd-thumbnail, ytd-item-section-renderer, ytd-section-list-renderer)
    // until it hits the known per-card tag.
    const doc = makeDoc(`
      <ytd-section-list-renderer>
        <div id="contents">
          <ytd-item-section-renderer>
            <div id="contents">
              <ytd-video-renderer>
                <div id="dismissible">
                  <ytd-thumbnail>
                    <a href="/watch?v=X"><img></a>
                  </ytd-thumbnail>
                </div>
              </ytd-video-renderer>
            </div>
          </ytd-item-section-renderer>
        </div>
      </ytd-section-list-renderer>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    expect(names(findCardHosts(parent, doc.defaultView as Window)))
      .toEqual(['ytd-video-renderer']);
  });

  it('returns yt-lockup-view-model when normal display (related sidebar)', () => {
    const doc = makeDoc(`
      <ytd-watch-next-secondary-results-renderer>
        <yt-lockup-view-model>
          <div class="parent">
            <a href="/watch?v=X"><img></a>
          </div>
        </yt-lockup-view-model>
      </ytd-watch-next-secondary-results-renderer>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    expect(names(findCardHosts(parent, doc.defaultView as Window)))
      .toEqual(['yt-lockup-view-model']);
  });

  it('returns ytd-playlist-panel-video-renderer for mix sidebar (inner anchor)', () => {
    const doc = makeDoc(`
      <ytd-playlist-panel-renderer>
        <ytd-playlist-panel-video-renderer>
          <a id="wc-endpoint" href="/watch?v=X">
            <div>
              <ytd-thumbnail>
                <a id="thumb" href="/watch?v=X"><img></a>
              </ytd-thumbnail>
            </div>
          </a>
        </ytd-playlist-panel-video-renderer>
      </ytd-playlist-panel-renderer>
    `);
    const inner = doc.querySelector('a#thumb') as HTMLAnchorElement;
    expect(names(findCardHosts(inner.parentElement as Element, doc.defaultView as Window)))
      .toEqual(['ytd-playlist-panel-video-renderer']);
  });

  it('returns ytm-shorts-lockup-view-model for shorts feed', () => {
    const doc = makeDoc(`
      <grid-shelf-view-model>
        <ytm-shorts-lockup-view-model>
          <a href="/shorts/X"><img></a>
        </ytm-shorts-lockup-view-model>
      </grid-shelf-view-model>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    expect(names(findCardHosts(parent, doc.defaultView as Window)))
      .toEqual(['ytm-shorts-lockup-view-model']);
  });

  it('returns empty array + warns for stray anchor not inside a known card', () => {
    // Page-chrome /watch link with no card ancestor — should be ignored
    // entirely so the climb doesn't leak into ytd-app or page-manager.
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doc = makeDoc(`
      <ytd-app>
        <ytd-page-manager>
          <div><a href="/watch?v=X"><img></a></div>
        </ytd-page-manager>
      </ytd-app>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    const hosts = findCardHosts(parent, doc.defaultView as Window);
    expect(hosts).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
