/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { extractDomChannel } from '../dom-fallback.js';

describe('extractDomChannel via collectOwnerChannels', () => {
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

  it('joins multiple collab channels with ", "', () => {
    document.body.innerHTML = `
      <ytd-video-owner-renderer>
        <a href="/channel/UCaaaaaaaaaaaaaaaaaaaaaa">A</a>
        <a href="/channel/UCbbbbbbbbbbbbbbbbbbbbbb">B</a>
      </ytd-video-owner-renderer>
    `;
    expect(extractDomChannel()).toBe('A, B');
  });

  it('returns null on a watch page with no owner anchors', () => {
    document.body.innerHTML = '';
    expect(extractDomChannel()).toBeNull();
  });
});
