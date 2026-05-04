/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { isThumbnailAnchor } from './cards.js';
import { findCardHost } from './cards.js';

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

describe('findCardHost', () => {
  it('returns the nearest custom-element ancestor with a real layout box', () => {
    const doc = makeDoc(`
      <ytd-rich-item-renderer>
        <div class="parent">
          <a href="/watch?v=X"><img></a>
        </div>
      </ytd-rich-item-renderer>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    const host = findCardHost(parent, doc.defaultView as Window);
    expect(host?.tagName.toLowerCase()).toBe('ytd-rich-item-renderer');
  });

  it('skips display:contents custom elements and climbs to a real host', () => {
    const doc = makeDoc(`
      <ytd-rich-item-renderer>
        <yt-lockup-view-model style="display: contents">
          <div class="parent">
            <a href="/watch?v=X"><img></a>
          </div>
        </yt-lockup-view-model>
      </ytd-rich-item-renderer>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    const host = findCardHost(parent, doc.defaultView as Window);
    expect(host?.tagName.toLowerCase()).toBe('ytd-rich-item-renderer');
  });

  it('marks a non-contents yt-lockup-view-model when no further ancestor is custom', () => {
    const doc = makeDoc(`
      <yt-lockup-view-model>
        <div class="parent">
          <a href="/watch?v=X"><img></a>
        </div>
      </yt-lockup-view-model>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    const host = findCardHost(parent, doc.defaultView as Window);
    expect(host?.tagName.toLowerCase()).toBe('yt-lockup-view-model');
  });

  it('returns null when no custom-element ancestor exists', () => {
    const doc = makeDoc(`
      <div class="parent">
        <a href="/watch?v=X"><img></a>
      </div>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    const host = findCardHost(parent, doc.defaultView as Window);
    expect(host).toBeNull();
  });
});
