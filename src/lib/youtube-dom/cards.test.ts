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

  it('returns the nearest custom-element ancestor when sole card-level host', () => {
    // Homepage rich-grid: yt-lockup-view-model is display:contents so it's
    // skipped; ytd-rich-item-renderer is the per-card box. Climb stops there
    // because its parent is ytd-rich-grid-row (custom — list container).
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

  it('returns inner + outer when card has nested custom-element wrappers', () => {
    // Search lockup: ytd-video-renderer (outer) > #dismissible (div) >
    // ytd-thumbnail (inner) > a. Both inner and outer are card-level hosts;
    // marking only inner leaves text-area hover dead.
    const doc = makeDoc(`
      <ytd-item-section-renderer>
        <ytd-video-renderer>
          <div id="dismissible">
            <ytd-thumbnail>
              <a href="/watch?v=X"><img></a>
            </ytd-thumbnail>
            <div class="text-wrapper">title here</div>
          </div>
        </ytd-video-renderer>
      </ytd-item-section-renderer>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    expect(names(findCardHosts(parent, doc.defaultView as Window)))
      .toEqual(['ytd-thumbnail', 'ytd-video-renderer']);
  });

  it('returns yt-lockup-view-model when it has a real layout box and no further custom ancestor', () => {
    const doc = makeDoc(`
      <yt-lockup-view-model>
        <div class="parent">
          <a href="/watch?v=X"><img></a>
        </div>
      </yt-lockup-view-model>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    expect(names(findCardHosts(parent, doc.defaultView as Window)))
      .toEqual(['yt-lockup-view-model']);
  });

  it('returns empty array + warns when no custom-element ancestor exists', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doc = makeDoc(`
      <div class="parent">
        <a href="/watch?v=X"><img></a>
      </div>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    const hosts = findCardHosts(parent, doc.defaultView as Window);
    expect(hosts).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
