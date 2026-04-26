/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { extractDomChannel } from '../dom-fallback.js';

describe('extractDomChannel via extractOwnerLabel', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns single channel name unchanged', () => {
    document.body.innerHTML = `
      <ytd-video-owner-renderer>
        <a href="/channel/UCaaaaaaaaaaaaaaaaaaaaaa">米津玄師</a>
      </ytd-video-owner-renderer>
    `;
    expect(extractDomChannel()).toBe('米津玄師');
  });

  it('returns the multi-creator label from a javascript:void(0) anchor verbatim', () => {
    document.body.innerHTML = `
      <ytd-video-owner-renderer>
        <a href="" tabindex="-1"></a>
        <a href="javascript:void(0)">Kotoha 및 星川サラ / Sara Hoshikawa</a>
      </ytd-video-owner-renderer>
    `;
    expect(extractDomChannel()).toBe('Kotoha 및 星川サラ / Sara Hoshikawa');
  });

  it('returns null on a watch page with no owner anchors', () => {
    document.body.innerHTML = '';
    expect(extractDomChannel()).toBeNull();
  });
});
