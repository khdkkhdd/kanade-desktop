import { describe, it, expect } from 'vitest';
import {
  initialToRow,
  rowsToCredits,
  collectLocalNewArtists,
  type ArtistCreditRow,
} from './artist-credits-row.js';

describe('initialToRow', () => {
  it('maps existing-artist entry to a committed row with picker label', () => {
    const row = initialToRow({
      artistId: 42,
      displayName: '아도',
      originalName: 'Ado',
      role: 'vocal',
      isPublic: true,
    });
    expect(row.picked).toEqual({ id: 42, displayLabel: '아도', originalLabel: 'Ado' });
    expect(row.creating).toBe(false);
    expect(row.role).toBe('vocal');
    expect(row.isPublic).toBe(true);
    expect(row.newArtist).toBeUndefined();
  });

  it('falls back to "Artist #id" when displayName missing', () => {
    const row = initialToRow({ artistId: 7, role: null, isPublic: false });
    expect(row.picked?.displayLabel).toBe('Artist #7');
  });

  it('maps inline new-artist entry preserving newArtist payload and picker id=-1', () => {
    const newArtist = {
      type: 'solo' as const,
      names: [{ name: 'NewName', language: 'ja', isMain: true }],
    };
    const row = initialToRow({ newArtist, role: 'composer', isPublic: true });
    expect(row.picked).toEqual({ id: -1, displayLabel: 'NewName' });
    expect(row.newArtist).toBe(newArtist);
    expect(row.role).toBe('composer');
  });

  it('labels new-artist as "(new)" when no isMain entry', () => {
    const row = initialToRow({
      newArtist: { type: 'solo', names: [{ name: 'X', language: 'ja', isMain: false }] },
      role: null,
      isPublic: true,
    });
    expect(row.picked?.displayLabel).toBe('(new)');
  });
});

describe('rowsToCredits', () => {
  const completeExisting: ArtistCreditRow = {
    picked: { id: 10, displayLabel: 'A' },
    creating: false,
    role: 'vocal',
    isPublic: true,
  };
  const completeNew: ArtistCreditRow = {
    picked: { id: -1, displayLabel: 'NewName' },
    creating: false,
    role: null,
    isPublic: true,
    newArtist: {
      type: 'solo',
      names: [{ name: 'NewName', language: 'ja', isMain: true }],
    },
  };
  const incompleteEmpty: ArtistCreditRow = {
    picked: null,
    creating: false,
    role: null,
    isPublic: true,
  };
  const incompleteMidEdit: ArtistCreditRow = {
    picked: null,
    creating: true,
    role: null,
    isPublic: true,
  };

  it('keeps rows with a picked existing artist', () => {
    expect(rowsToCredits([completeExisting])).toEqual([
      { artistId: 10, role: 'vocal', isPublic: true },
    ]);
  });

  it('keeps rows with an inline newArtist', () => {
    const credits = rowsToCredits([completeNew]);
    expect(credits).toHaveLength(1);
    expect('newArtist' in credits[0]).toBe(true);
  });

  it('drops rows that are empty (picker untouched)', () => {
    expect(rowsToCredits([incompleteEmpty])).toEqual([]);
  });

  it('drops rows mid-edit (ArtistQuickAdd open, not submitted)', () => {
    expect(rowsToCredits([incompleteMidEdit])).toEqual([]);
  });

  it('preserves order and mixes complete/incomplete correctly', () => {
    const credits = rowsToCredits([completeExisting, incompleteEmpty, completeNew, incompleteMidEdit]);
    expect(credits).toHaveLength(2);
    expect((credits[0] as any).artistId).toBe(10);
    expect('newArtist' in credits[1]).toBe(true);
  });

  it('propagates newArtistTempId onto the emitted credit', () => {
    const rowWithTempId: ArtistCreditRow = {
      ...completeNew,
      newArtistTempId: 't42',
    };
    const [credit] = rowsToCredits([rowWithTempId]);
    expect(credit).toMatchObject({ tempId: 't42' });
  });

  it('omits tempId when the row has none (legacy shape)', () => {
    const [credit] = rowsToCredits([completeNew]);
    expect((credit as any).tempId).toBeUndefined();
  });
});

describe('collectLocalNewArtists', () => {
  const make = (tempId: string, name: string, localId: number): ArtistCreditRow => ({
    picked: { id: localId, displayLabel: name },
    creating: false,
    role: null,
    isPublic: true,
    newArtist: { type: 'solo', names: [{ name, language: 'ja', isMain: true }] },
    newArtistTempId: tempId,
  });

  it('returns empty when no rows have newArtistTempId', () => {
    expect(collectLocalNewArtists([[
      { picked: { id: 10, displayLabel: 'X' }, creating: false, role: null, isPublic: true },
    ]])).toEqual([]);
  });

  it('collects unique entries across multiple row sources', () => {
    const result = collectLocalNewArtists([
      [make('t1', 'A', -1001)],
      [make('t2', 'B', -1002)],
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.tempId).sort()).toEqual(['t1', 't2']);
  });

  it('dedupes by tempId when the same local artist appears in multiple sources', () => {
    const result = collectLocalNewArtists([
      [make('t1', 'Shared', -1001)],
      [make('t1', 'Shared', -1001)],
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].tempId).toBe('t1');
  });

  it('ignores undefined sources', () => {
    expect(collectLocalNewArtists([undefined, [make('t1', 'A', -1001)], undefined]))
      .toHaveLength(1);
  });
});
