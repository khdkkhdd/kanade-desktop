import { createSignal, createEffect, Index, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { ArtistCreditInput, NewArtistInput } from '../../../admin/types.js';
import { EntityPicker, type EntitySearchResult } from '../../../admin/components/EntityPicker.js';
import { ArtistQuickAdd } from '../../../admin/components/ArtistQuickAdd.js';
import { RoleAutocomplete } from '../../../admin/components/RoleAutocomplete.js';

type Credit = ArtistCreditInput | { newArtist: NewArtistInput; role: string | null; isPublic: boolean };

/** Initial row state for the picker. Supports three cases:
 *   - existing artist with known name (edit mode server data)
 *   - existing artist with no name (draft restore — falls back to "Artist #id")
 *   - inline new artist (draft restore mid-creation) */
export type ArtistCreditInitial =
  | { artistId: number; displayName?: string; originalName?: string; role: string | null; isPublic: boolean }
  | { newArtist: NewArtistInput; role: string | null; isPublic: boolean };

export interface ArtistCreditsSectionProps {
  ctx: RendererContext;
  context: 'work' | 'recording';
  credits: Credit[];
  onChange: (next: Credit[]) => void;
  channelHint?: { channelExternalId: string; artists: Array<{ id: number; displayName: string }> };
  /** If provided, prefill rows with these existing credits (used in edit mode). */
  initial?: ArtistCreditInitial[];
}

interface Row {
  picked: EntitySearchResult | null;
  creating: boolean;
  role: string | null;
  isPublic: boolean;
  newArtist?: NewArtistInput;
}

export function ArtistCreditsSection(props: ArtistCreditsSectionProps) {
  const initialRows: Row[] = (props.initial ?? []).map((e) => {
    if ('newArtist' in e) {
      const displayLabel = e.newArtist.names.find((n) => n.isMain)?.name ?? '(new)';
      return {
        picked: { id: -1, displayLabel },
        creating: false,
        role: e.role,
        isPublic: e.isPublic,
        newArtist: e.newArtist,
      };
    }
    return {
      picked: {
        id: e.artistId,
        displayLabel: e.displayName ?? `Artist #${e.artistId}`,
        originalLabel: e.originalName,
      },
      creating: false,
      role: e.role,
      isPublic: e.isPublic,
    };
  });
  const [rows, setRows] = createSignal<Row[]>(initialRows);
  const [hintDismissed, setHintDismissed] = createSignal(false);

  async function search(q: string): Promise<EntitySearchResult[]> {
    const r = (await props.ctx.ipc.invoke('search-artists', { q })) as any;
    if (!r?.ok) return [];
    return r.data.map((a: { id: number; displayName: string; originalName?: string }) => ({
      id: a.id,
      displayLabel: a.displayName,
      originalLabel: a.originalName,
    }));
  }

  createEffect(() => {
    const credits: Credit[] = rows().map((r) => {
      if (r.newArtist) return { newArtist: r.newArtist, role: r.role, isPublic: r.isPublic };
      if (r.picked) return { artistId: r.picked.id, role: r.role, isPublic: r.isPublic };
      return { artistId: 0, role: r.role, isPublic: r.isPublic };
    }).filter((c) => ('newArtist' in c) || (c.artistId > 0));
    props.onChange(credits);
  });

  function addRow(preset?: Partial<Row>) {
    const r: Row = { picked: null, creating: false, role: null, isPublic: rows().length === 0, ...preset };
    setRows([...rows(), r]);
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows(rows().map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function removeRow(i: number) {
    setRows(rows().filter((_, idx) => idx !== i));
  }

  function acceptHint(artist: { id: number; displayName: string }) {
    // Channel ↔ artist linkage carries no role information, so we can't
    // assume the hinted artist is a vocalist (a channel may belong to a
    // composer or a group with mixed roles). Leave role blank and let the
    // admin pick it — matches the manual-add default.
    addRow({
      picked: { id: artist.id, displayLabel: artist.displayName },
      role: null,
      isPublic: true,
    });
    setHintDismissed(true);
  }

  return (
    <div>
      <div class="kanade-admin-subsection__title">
        {props.context === 'recording' ? '참여 아티스트' : '창작자'}
      </div>
      <Show when={props.channelHint && !hintDismissed() && (props.channelHint.artists?.length ?? 0) > 0}>
        <div class="kanade-admin-banner kanade-admin-banner--info" style="margin-top: 8px;">
          <span style="flex: 1;">이 채널은 <strong>{props.channelHint!.artists[0].displayName}</strong>의 채널입니다.</span>
          <button
            type="button"
            class="kanade-admin-btn kanade-admin-btn--primary"
            onClick={() => acceptHint(props.channelHint!.artists[0])}
          >
            자동 추가
          </button>
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
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
        <Index each={rows()}>
          {(row, i) => (
            <div class="kanade-admin-credit-row">
              <Show when={!row().creating}>
                <EntityPicker
                  entityType="artist"
                  value={row().picked}
                  onSelect={(item) => {
                    if (item) updateRow(i, { picked: item, newArtist: undefined });
                    else updateRow(i, { picked: null });
                  }}
                  onCreateRequested={() => updateRow(i, { creating: true })}
                  allowCreate={true}
                  search={search}
                />
              </Show>
              <Show when={row().creating}>
                <ArtistQuickAdd
                  onSubmit={(artist) => {
                    updateRow(i, {
                      newArtist: artist,
                      creating: false,
                      picked: { id: -1, displayLabel: artist.names.find((n) => n.isMain)?.name ?? '(new)' },
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
