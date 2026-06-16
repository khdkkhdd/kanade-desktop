import { describe, it, expect } from 'vitest';
import { outgoingChipDefs } from './artist-section.js';
import type { ArtistRelation } from '../types.js';

function rel(
  direction: 'outgoing' | 'incoming',
  publicId: string,
  name: string,
  originalName = name,
): ArtistRelation {
  return { type: 'associated', direction, artist: { publicId, name, originalName, type: 'person' } };
}

describe('outgoingChipDefs', () => {
  it('keeps only outgoing relations, in order', () => {
    const defs = outgoingChipDefs([
      rel('outgoing', 'a1', 'One'),
      rel('incoming', 'a2', 'Two'),
      rel('outgoing', 'a3', 'Three'),
    ]);
    expect(defs.map((d) => d.artistPublicId)).toEqual(['a1', 'a3']);
  });

  it('formats name with original when they differ', () => {
    const defs = outgoingChipDefs([rel('outgoing', 'a1', '초음파', '超音波')]);
    expect(defs[0].name).toBe('초음파 (超音波)');
  });
});
