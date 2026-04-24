import type { EntitySearchResult } from '../../../admin/components/EntityPicker.js';
import type { ArtistCreditInput, NewArtistInput } from '../../../admin/types.js';

export type Credit =
  | ArtistCreditInput
  | { newArtist: NewArtistInput; role: string | null; isPublic: boolean };

export type ArtistCreditInitial =
  | { artistId: number; displayName?: string; originalName?: string; role: string | null; isPublic: boolean }
  | { newArtist: NewArtistInput; role: string | null; isPublic: boolean };

/**
 * Full UI-state row for a single credit. Includes mid-edit states
 * (empty picker, in-progress ArtistQuickAdd) that must be preserved across
 * drawer close/open but must NOT reach the submit payload.
 *
 * Serializable as plain JSON — safe to persist in the draft Map.
 */
export interface ArtistCreditRow {
  picked: EntitySearchResult | null;
  creating: boolean;
  role: string | null;
  isPublic: boolean;
  newArtist?: NewArtistInput;
}

/** Derive the initial row state from prefilled credits (server edit mode or draft fallback). */
export function initialToRow(entry: ArtistCreditInitial): ArtistCreditRow {
  if ('newArtist' in entry) {
    const displayLabel = entry.newArtist.names.find((n) => n.isMain)?.name ?? '(new)';
    return {
      picked: { id: -1, displayLabel },
      creating: false,
      role: entry.role,
      isPublic: entry.isPublic,
      newArtist: entry.newArtist,
    };
  }
  return {
    picked: {
      id: entry.artistId,
      displayLabel: entry.displayName ?? `Artist #${entry.artistId}`,
      originalLabel: entry.originalName,
    },
    creating: false,
    role: entry.role,
    isPublic: entry.isPublic,
  };
}

/**
 * Project rows to submit-ready credits. Drops rows that haven't been
 * committed: no picked artist AND no inline newArtist yet. Keeps the
 * full UI row state available separately for draft persistence.
 */
export function rowsToCredits(rows: ArtistCreditRow[]): Credit[] {
  return rows
    .map<Credit>((r) => {
      if (r.newArtist) return { newArtist: r.newArtist, role: r.role, isPublic: r.isPublic };
      if (r.picked) return { artistId: r.picked.id, role: r.role, isPublic: r.isPublic };
      return { artistId: 0, role: r.role, isPublic: r.isPublic };
    })
    .filter((c) => ('newArtist' in c) || (c.artistId > 0));
}
