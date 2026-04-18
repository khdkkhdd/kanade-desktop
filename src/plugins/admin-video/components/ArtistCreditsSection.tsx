import { createSignal, For, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { ArtistCreditInput, NewArtistInput } from '../../../admin/types.js';
import { EntityPicker, type EntitySearchResult } from '../../../admin/components/EntityPicker.js';
import { ArtistQuickAdd } from '../../../admin/components/ArtistQuickAdd.js';
import { RoleAutocomplete } from '../../../admin/components/RoleAutocomplete.js';

type Credit = ArtistCreditInput | { newArtist: NewArtistInput; role: string | null; isPublic: boolean };

export interface ArtistCreditsSectionProps {
  ctx: RendererContext;
  context: 'work' | 'recording';
  credits: Credit[];
  onChange: (next: Credit[]) => void;
  channelHint?: { channelExternalId: string; artists: Array<{ id: number; displayName: string }> };
}

interface Row {
  picked: EntitySearchResult | null;
  creating: boolean;
  role: string | null;
  isPublic: boolean;
  newArtist?: NewArtistInput;
}

export function ArtistCreditsSection(props: ArtistCreditsSectionProps) {
  const [rows, setRows] = createSignal<Row[]>([]);
  const [hintDismissed, setHintDismissed] = createSignal(false);

  async function search(q: string): Promise<EntitySearchResult[]> {
    const r = (await props.ctx.ipc.invoke('search-artists', { q })) as any;
    if (!r?.ok) return [];
    return r.data.map((a: { id: number; displayName: string; type: string }) => ({
      id: a.id,
      displayLabel: a.displayName,
      subLabel: a.type,
    }));
  }

  function emit() {
    const credits: Credit[] = rows().map((r) => {
      if (r.newArtist) return { newArtist: r.newArtist, role: r.role, isPublic: r.isPublic };
      if (r.picked) return { artistId: r.picked.id, role: r.role, isPublic: r.isPublic };
      return { artistId: 0, role: r.role, isPublic: r.isPublic };
    }).filter((c) => ('newArtist' in c) || (c.artistId > 0));
    props.onChange(credits);
  }

  function addRow(preset?: Partial<Row>) {
    const r: Row = { picked: null, creating: false, role: null, isPublic: rows().length === 0, ...preset };
    setRows([...rows(), r]);
    emit();
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows(rows().map((r, idx) => idx === i ? { ...r, ...patch } : r));
    emit();
  }

  function removeRow(i: number) {
    setRows(rows().filter((_, idx) => idx !== i));
    emit();
  }

  function acceptHint(artist: { id: number; displayName: string }) {
    addRow({
      picked: { id: artist.id, displayLabel: artist.displayName },
      role: props.context === 'recording' ? 'vocal' : null,
      isPublic: true,
    });
    setHintDismissed(true);
  }

  return (
    <div>
      <div class="kanade-admin-section__title">
        {props.context === 'recording' ? '참여 아티스트' : '창작자'}
      </div>
      <Show when={props.channelHint && !hintDismissed() && (props.channelHint.artists?.length ?? 0) > 0}>
        <div class="kanade-admin-banner kanade-admin-banner--info">
          <span>이 채널은 <strong>{props.channelHint!.artists[0].displayName}</strong>의 채널입니다.</span>
          <button
            type="button"
            class="kanade-admin-btn"
            style="margin-left: auto;"
            onClick={() => acceptHint(props.channelHint!.artists[0])}
          >
            자동 추가
          </button>
          <button
            type="button"
            class="kanade-admin-btn"
            onClick={() => setHintDismissed(true)}
          >
            ×
          </button>
        </div>
      </Show>
      <For each={rows()}>
        {(row, i) => (
          <div style="background: #262626; padding: 8px; border-radius: 4px; margin-bottom: 6px;">
            <Show when={!row.creating}>
              <EntityPicker
                entityType="artist"
                value={row.picked}
                onSelect={(item) => {
                  if (item) updateRow(i(), { picked: item, newArtist: undefined });
                  else updateRow(i(), { picked: null });
                }}
                onCreateRequested={() => updateRow(i(), { creating: true })}
                allowCreate={true}
                search={search}
              />
            </Show>
            <Show when={row.creating}>
              <ArtistQuickAdd
                onSubmit={(artist) => {
                  updateRow(i(), {
                    newArtist: artist,
                    creating: false,
                    picked: { id: -1, displayLabel: artist.names.find((n) => n.isMain)?.name ?? '(new)' },
                  });
                }}
                onCancel={() => updateRow(i(), { creating: false })}
              />
            </Show>
            <div style="display: flex; gap: 6px; margin-top: 6px; align-items: center;">
              <div style="flex: 1;">
                <RoleAutocomplete
                  context={props.context}
                  value={row.role}
                  onChange={(v) => updateRow(i(), { role: v })}
                />
              </div>
              <label style="font-size: 12px; display: flex; gap: 4px; align-items: center;">
                <input
                  type="checkbox"
                  checked={row.isPublic}
                  onChange={(e) => updateRow(i(), { isPublic: e.currentTarget.checked })}
                />
                public
              </label>
              <button type="button" class="kanade-admin-btn" onClick={() => removeRow(i())}>×</button>
            </div>
          </div>
        )}
      </For>
      <button type="button" class="kanade-admin-btn" onClick={() => addRow()}>
        + 아티스트 추가
      </button>
    </div>
  );
}
