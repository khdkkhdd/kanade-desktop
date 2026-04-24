import { createSignal, createEffect, For, Index, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { EntitySearchResult } from '../../../admin/components/EntityPicker.js';
import { EntityPicker } from '../../../admin/components/EntityPicker.js';
import { ArtistQuickAdd } from '../../../admin/components/ArtistQuickAdd.js';
import { RoleAutocomplete } from '../../../admin/components/RoleAutocomplete.js';
import { formatWithOriginal } from '../../../shared/title-utils.js';
import {
  initialToRow,
  rowsToCredits,
  nextLocalArtistIdentity,
  type ArtistCreditInitial,
  type ArtistCreditRow,
  type Credit,
  type LocalNewArtist,
} from './artist-credits-row.js';

export type { ArtistCreditInitial, ArtistCreditRow, LocalNewArtist } from './artist-credits-row.js';

type Row = ArtistCreditRow;

export interface ArtistCreditsSectionProps {
  ctx: RendererContext;
  context: 'work' | 'recording';
  credits: Credit[];
  onChange: (next: Credit[]) => void;
  channelHint?: { artists: Array<{ id: number; displayName: string; originalName?: string }> };
  /** If provided, prefill rows with these existing credits (used in edit mode). */
  initial?: ArtistCreditInitial[];
  /** Draft-restore slot. When present, takes priority over `initial` and carries
   *  the full UI row state (including mid-edit rows that don't yet pass the
   *  submit filter). Pair with `onRowsChange` to persist the editor state
   *  across drawer close/open. */
  initialRows?: Row[];
  /** Fires on every internal row mutation with the full row list — including
   *  incomplete rows. The caller is expected to persist this into the draft
   *  so `initialRows` can restore it on reopen. `onChange` still fires with
   *  the filtered submit payload independently. */
  onRowsChange?: (rows: Row[]) => void;
  /** Shared pool of locally-pending artists created earlier in the same
   *  drawer session (typically from a sibling section). Surfaced in the
   *  picker search so the user can pick one without re-entering it; the
   *  submit path dedupes by `tempId` so the backing artist is created once. */
  localNewArtists?: LocalNewArtist[];
}

export function ArtistCreditsSection(props: ArtistCreditsSectionProps) {
  const seededRows: Row[] = props.initialRows ?? (props.initial ?? []).map(initialToRow);
  const [rows, setRows] = createSignal<Row[]>(seededRows);
  const [hintDismissed, setHintDismissed] = createSignal(false);

  async function search(q: string): Promise<EntitySearchResult[]> {
    const r = (await props.ctx.ipc.invoke('search-artists', { q })) as any;
    const pickedIds = new Set(rows().map((row) => row.picked?.id).filter((id): id is number => id != null));
    const pickedTempIds = new Set(
      rows().map((row) => row.newArtistTempId).filter((id): id is string => !!id),
    );

    // Backend results (existing DB artists).
    const backend: EntitySearchResult[] = r?.ok
      ? r.data
          .filter((a: { id: number }) => !pickedIds.has(a.id))
          .map((a: { id: number; displayName: string; originalName?: string }) => ({
            id: a.id,
            displayLabel: a.displayName,
            originalLabel: a.originalName,
          }))
      : [];

    // Locally-pending artists created inline in this session. Match by
    // name substring (case-insensitive); empty query matches all.
    const needle = q.trim().toLowerCase();
    const local: EntitySearchResult[] = (props.localNewArtists ?? [])
      .filter((la) => !pickedTempIds.has(la.tempId))
      .filter((la) => {
        if (!needle) return true;
        return la.input.names.some((n) => n.name.toLowerCase().includes(needle));
      })
      .map((la) => {
        const main = la.input.names.find((n) => n.isMain) ?? la.input.names[0];
        return {
          id: la.localId,
          displayLabel: main?.name ?? '(new)',
          subLabel: '🔖 이 세션에서 추가됨',
          tempId: la.tempId,
        };
      });

    // Local entries first so users notice the ones they just created.
    return [...local, ...backend];
  }

  // Submit payload: only rows that have resolved to a concrete artist
  // (existing picker selection or committed newArtist). Incomplete rows are
  // filtered out so mid-edit state never reaches the server.
  createEffect(() => {
    props.onChange(rowsToCredits(rows()));
  });

  // Draft persistence: full row list including incomplete rows. Pairing this
  // with an `initialRows` prop lets the caller round-trip editor state across
  // drawer close/open without losing in-progress entries.
  createEffect(() => {
    props.onRowsChange?.(rows());
  });

  function addRow(preset?: Partial<Row>) {
    const r: Row = { picked: null, creating: false, role: null, isPublic: true, ...preset };
    setRows([...rows(), r]);
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows(rows().map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function removeRow(i: number) {
    setRows(rows().filter((_, idx) => idx !== i));
  }

  function acceptHint(artist: { id: number; displayName: string; originalName?: string }) {
    // Channel ↔ artist linkage carries no role information, so we can't
    // assume the hinted artist is a vocalist (a channel may belong to a
    // composer or a group with mixed roles). Leave role blank and let the
    // admin pick it — matches the manual-add default.
    addRow({
      picked: {
        id: artist.id,
        displayLabel: artist.displayName,
        originalLabel: artist.originalName,
      },
      role: null,
      isPublic: true,
    });
    // Keep the banner open — when a channel has multiple linked artists,
    // the rest stay visible so the admin can keep clicking. Banner self-
    // hides once all linked artists are picked.
  }

  return (
    <div>
      <div class="kanade-admin-subsection__title">
        {props.context === 'recording' ? '참여 아티스트' : '창작자'}
      </div>
      {(() => {
        const availableHints = () => {
          const hints = props.channelHint?.artists ?? [];
          if (hints.length === 0) return [];
          const pickedIds = new Set(
            rows().map((r) => r.picked?.id).filter((id): id is number => id != null),
          );
          return hints.filter((a) => !pickedIds.has(a.id));
        };
        return (
          <Show when={!hintDismissed() && availableHints().length > 0}>
            <div class="kanade-admin-banner kanade-admin-banner--info" style="margin-top: 8px; flex-wrap: wrap;">
              <span>이 채널의 아티스트:</span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; flex: 1;">
                <For each={availableHints()}>
                  {(artist) => (
                    <button
                      type="button"
                      class="kanade-admin-btn kanade-admin-btn--primary"
                      onClick={() => acceptHint(artist)}
                    >
                      + {formatWithOriginal(artist.displayName, artist.originalName)}
                    </button>
                  )}
                </For>
              </div>
              <button
                type="button"
                class="kanade-admin-btn kanade-admin-btn--icon"
                aria-label="힌트 닫기"
                onClick={() => setHintDismissed(true)}
              >
                ×
              </button>
            </div>
          </Show>
        );
      })()}
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
        <Index each={rows()}>
          {(row, i) => (
            <div class="kanade-admin-credit-row">
              <Show when={!row().creating}>
                <EntityPicker
                  entityType="artist"
                  value={row().picked}
                  onSelect={(item) => {
                    if (!item) {
                      updateRow(i, { picked: null, newArtist: undefined, newArtistTempId: undefined });
                      return;
                    }
                    if (item.tempId) {
                      // Picking a locally-pending artist created elsewhere in
                      // the session — reuse its newArtist input + tempId so
                      // submit dedupes to a single POST /admin/artists.
                      const pool = (props.localNewArtists ?? []).find((la) => la.tempId === item.tempId);
                      if (pool) {
                        updateRow(i, {
                          picked: item,
                          newArtist: pool.input,
                          newArtistTempId: pool.tempId,
                        });
                        return;
                      }
                    }
                    updateRow(i, { picked: item, newArtist: undefined, newArtistTempId: undefined });
                  }}
                  onCreateRequested={() => updateRow(i, { creating: true })}
                  allowCreate={true}
                  search={search}
                />
              </Show>
              <Show when={row().creating}>
                <ArtistQuickAdd
                  onSubmit={(artist) => {
                    const { tempId, localId } = nextLocalArtistIdentity();
                    updateRow(i, {
                      newArtist: artist,
                      newArtistTempId: tempId,
                      creating: false,
                      picked: {
                        id: localId,
                        displayLabel: artist.names.find((n) => n.isMain)?.name ?? '(new)',
                        tempId,
                      },
                    });
                  }}
                  onCancel={() => updateRow(i, { creating: false })}
                />
              </Show>
              <div class="kanade-admin-credit-row__actions">
                <div class="kanade-admin-credit-row__role">
                  <RoleAutocomplete
                    context={props.context}
                    value={row().role}
                    onChange={(v) => updateRow(i, { role: v })}
                  />
                </div>
                <label class="kanade-admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={row().isPublic}
                    onChange={(e) => updateRow(i, { isPublic: e.currentTarget.checked })}
                  />
                  public
                </label>
                <button
                  type="button"
                  class="kanade-admin-btn kanade-admin-btn--icon"
                  aria-label="아티스트 제거"
                  onClick={() => removeRow(i)}
                >×</button>
              </div>
            </div>
          )}
        </Index>
      </div>
      <button type="button" class="kanade-admin-btn kanade-admin-btn--ghost" style="margin-top: 8px;" onClick={() => addRow()}>
        + 아티스트 추가
      </button>
    </div>
  );
}
