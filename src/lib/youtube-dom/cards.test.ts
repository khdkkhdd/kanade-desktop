/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { isThumbnailAnchor, findCardHost } from './cards.js';
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
  it('false when anchor wraps a nested inner anchor (card-wide wrapper)', () => {
    // Mix sidebar (ytd-playlist-panel-video-renderer) wraps the whole card
    // in #wc-endpoint, with #thumbnail nested inside. The outer is a wrapper,
    // not a thumbnail-specific target — injecting on it duplicates the button.
    // Note: HTML parser disallows <a><a></a></a>, but YouTube builds these
    // programmatically. We do the same to faithfully reproduce the bug.
    const doc = makeDoc('');
    const outer = doc.createElement('a');
    outer.id = 'wc-endpoint';
    outer.href = '/watch?v=X';
    const inner = doc.createElement('a');
    inner.id = 'thumbnail';
    inner.href = '/watch?v=X';
    const img = doc.createElement('yt-image');
    inner.appendChild(img);
    outer.appendChild(inner);
    doc.body.appendChild(outer);
    expect(isThumbnailAnchor(outer)).toBe(false);
  });
  it('true for the inner anchor of a nested wrapper', () => {
    const doc = makeDoc('');
    const outer = doc.createElement('a');
    outer.href = '/watch?v=X';
    const inner = doc.createElement('a');
    inner.href = '/watch?v=X';
    const img = doc.createElement('yt-image');
    inner.appendChild(img);
    outer.appendChild(inner);
    doc.body.appendChild(outer);
    expect(isThumbnailAnchor(inner)).toBe(true);
  });
});

describe('findCardHost', () => {
  beforeEach(() => {
    _resetWarnedForTesting();
  });

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
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doc = makeDoc(`
      <div class="parent">
        <a href="/watch?v=X"><img></a>
      </div>
    `);
    const a = doc.querySelector('a') as HTMLAnchorElement;
    const parent = a.parentElement as Element;
    const host = findCardHost(parent, doc.defaultView as Window);
    expect(host).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
