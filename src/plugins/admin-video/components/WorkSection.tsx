import { createSignal, createEffect, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { WorkSelection, TitleInput, ArtistCreditInput, NewArtistInput } from '../../../admin/types.js';
import { EntityPicker, type EntitySearchResult } from '../../../admin/components/EntityPicker.js';
import { TitleI18nInput } from '../../../admin/components/TitleI18nInput.js';
import { ArtistCreditsSection, type ArtistCreditInitial } from './ArtistCreditsSection.js';

type Credit = ArtistCreditInput | { newArtist: NewArtistInput; role: string | null; isPublic: boolean };

export interface WorkSectionProps {
  ctx: RendererContext;
  value: WorkSelection | null;
  onChange: (v: WorkSelection | null) => void;
  channelHint?: { channelExternalId: string; artists: Array<{ id: number; displayName: string }> };
  /** Display label for pre-selected existing work (edit mode). */
  initialLabel?: string;
  /** Original work id in edit mode — used to scope artist editing to the untouched work. */
  originalWorkId?: number;
  /** Existing work's artists (edit mode) — prefilled into the editor when the
   *  user keeps the original work selected. */
  originalArtists?: ArtistCreditInitial[];
  /** Called in edit mode whenever the user mutates the existing work's artists. */
  onExistingArtistsChange?: (next: Credit[]) => void;
}

export function WorkSection(props: WorkSectionProps) {
  const [picked, setPicked] = createSignal<EntitySearchResult | null>(
    props.value?.kind === 'existing'
      ? { id: props.value.id, displayLabel: props.initialLabel ?? `Work #${props.value.id}` }
      : null,
  );
  // When a draft restores with a new-work in progress, start in create mode
  // prefilled from the incoming value instead of a blank form.
  const [creating, setCreating] = createSignal(props.value?.kind === 'new');
  const [titles, setTitles] = createSignal<TitleInput[]>(
    props.value?.kind === 'new' ? props.value.titles : [],
  );
  const [newArtists, setNewArtists] = createSignal<Credit[]>(
    props.value?.kind === 'new' ? props.value.artists : [],
  );

  async function search(q: string): Promise<EntitySearchResult[]> {
    const r = (await props.ctx.ipc.invoke('search-works', { q })) as any;
    if (!r?.ok) return [];
    return r.data.map((w: { id: number; displayTitle: string }) => ({
      id: w.id,
      displayLabel: w.displayTitle,
    }));
  }

  function onPick(item: EntitySearchResult | null) {
    setPicked(item);
    if (item) {
      props.onChange({ kind: 'existing', id: item.id });
      setCreating(false);
    } else {
      props.onChange(null);
    }
  }

  function onCreateRequested() {
    setCreating(true);
    setTitles([]);
    setPicked(null);
    setNewArtists([]);
    props.onChange({ kind: 'new', titles: [], artists: [] });
  }

  // Keep emitted payload in sync with titles + newArtists while in create mode.
  createEffect(() => {
    if (!creating()) return;
    props.onChange({ kind: 'new', titles: titles(), artists: newArtists() });
  });

  // True iff user has the ORIGINAL existing work selected (edit mode, not reassigned).
  const editingOriginal = () =>
    props.originalWorkId !== undefined &&
    picked()?.id === props.originalWorkId &&
    !creating();

  return (
    <div class="kanade-admin-section">
      <div class="kanade-admin-section__title">📝 Work</div>
      <Show when={!creating()}>
        <EntityPicker
          entityType="work"
          value={picked()}
          onSelect={onPick}
          onCreateRequested={onCreateRequested}
          allowCreate={true}
          search={search}
        />
      </Show>
      <Show when={creating()}>
        <div style="background: #262626; padding: 10px; border-radius: 6px;">
          <div style="font-size: 12px; color: #aaa; margin-bottom: 6px;">새 Work 생성</div>
          <TitleI18nInput entity="work" titles={titles()} onChange={setTitles} />
          <div style="margin-top: 10px;">
            <ArtistCreditsSection
              ctx={props.ctx}
              context="work"
              credits={newArtists()}
              onChange={setNewArtists}
              initial={newArtists()}
              channelHint={props.channelHint}
            />
          </div>
          <button
            type="button"
            class="kanade-admin-btn"
            style="margin-top: 8px;"
            onClick={() => { setCreating(false); setNewArtists([]); props.onChange(null); }}
          >
            검색으로 돌아가기
          </button>
        </div>
      </Show>
      <Show when={editingOriginal() && props.onExistingArtistsChange}>
        <div style="margin-top: 10px;">
          <ArtistCreditsSection
            ctx={props.ctx}
            context="work"
            credits={[]}
            onChange={props.onExistingArtistsChange!}
            initial={props.originalArtists ?? []}
            channelHint={props.channelHint}
          />
        </div>
      </Show>
    </div>
  );
}
