/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { isThumbnailAnchor } from './cards.js';

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
