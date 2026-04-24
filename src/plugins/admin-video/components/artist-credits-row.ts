import type { EntitySearchResult } from '../../../admin/components/EntityPicker.js';
import type { ArtistCreditInput, NewArtistInput } from '../../../admin/types.js';

export type Credit =
  | ArtistCreditInput
  | { newArtist: NewArtistInput; role: string | null; isPublic: boolean; tempId?: string };

export type ArtistCreditInitial =
  | { artistId: number; displayName?: string; originalName?: string; role: string | null; isPublic: boolean }
  | { newArtist: NewArtistInput; role: string | null; isPublic: boolean; tempId?: string };

/**
 * Shared local-artist pool entry. A user can create an artist inline in one
 * section (work) and pick the same one in another (recording); the pool is
 * what makes the second pick possible without a round-trip to the server.
 * `tempId` is the stable identity used for submit-time dedup;
 * `localId` is a negative integer used to place the entry in the picker's
 * `pickedIds` set without colliding with real DB ids.
 */
export interface LocalNewArtist {
  tempId: string;
  localId: number;
  input: NewArtistInput;
}

/** Generate a fresh (tempId, localId) pair for a just-created local artist.
 *  Uniqueness is sufficient for a single drawer session; the counter resets
 *  on module reload which matches the in-memory draft lifetime. */
let tempSeq = 0;
export function nextLocalArtistIdentity(): { tempId: string; localId: number } {
  tempSeq += 1;
  return {
    tempId: `local-${Date.now()}-${tempSeq}`,
    localId: -1000 - tempSeq,
  };
}

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
  /** Set when `newArtist` corresponds to an entry in the shared local-artist
   *  pool. Submit-time dedup (performRegister) uses this to create the
   *  backing artist once even if the same tempId appears in multiple credits. */
  newArtistTempId?: string;
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
      newArtistTempId: entry.tempId,
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
      if (r.newArtist) {
        return r.newArtistTempId
          ? { newArtist: r.newArtist, role: r.role, isPublic: r.isPublic, tempId: r.newArtistTempId }
          : { newArtist: r.newArtist, role: r.role, isPublic: r.isPublic };
      }
      if (r.picked) return { artistId: r.picked.id, role: r.role, isPublic: r.isPublic };
      return { artistId: 0, role: r.role, isPublic: r.isPublic };
    })
    .filter((c) => ('newArtist' in c) || (c.artistId > 0));
}

/**
 * Scan one or more row lists for locally-pending new artists and collapse
 * duplicates by `newArtistTempId`. The resulting pool is what an
 * ArtistCreditsSection can merge into its picker search so a user can pick
 * an artist they just created in a sibling section.
 */
export function collectLocalNewArtists(rowSources: Array<ArtistCreditRow[] | undefined>): LocalNewArtist[] {
  const pool = new Map<string, LocalNewArtist>();
  for (const rows of rowSources) {
    if (!rows) continue;
    for (const r of rows) {
      if (!r.newArtist || !r.newArtistTempId || !r.picked) continue;
      if (!pool.has(r.newArtistTempId)) {
        pool.set(r.newArtistTempId, {
          tempId: r.newArtistTempId,
          localId: r.picked.id,
          input: r.newArtist,
        });
      }
    }
  }
  return Array.from(pool.values());
}
