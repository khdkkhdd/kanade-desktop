/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { collectOwnerChannels } from './owner-channels.js';

function makeDoc(html: string): Document {
  return new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`).window.document;
}

describe('collectOwnerChannels', () => {
  it('returns empty array when no owner anchors exist', () => {
    expect(collectOwnerChannels(makeDoc(''))).toEqual([]);
  });
});
