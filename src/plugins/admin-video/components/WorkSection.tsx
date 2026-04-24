import { createSignal, createEffect, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { WorkSelection, TitleInput, ArtistCreditInput, NewArtistInput } from '../../../admin/types.js';
import { EntityPicker, type EntitySearchResult } from '../../../admin/components/EntityPicker.js';
import { TitleI18nInput } from '../../../admin/components/TitleI18nInput.js';
import { normalizeTitles } from '../../../admin/title-utils.js';
import { formatWithOriginal } from '../../../shared/title-utils.js';
import { ArtistCreditsSection, type ArtistCreditInitial, type ArtistCreditRow, type LocalNewArtist } from './ArtistCreditsSection.js';

type Credit = ArtistCreditInput | { newArtist: NewArtistInput; role: string | null; isPublic: boolean };

export interface WorkSectionProps {
  ctx: RendererContext;
  value: WorkSelection | null;
  onChange: (v: WorkSelection | null) => void;
  channelHint?: { artists: Array<{ id: number; displayName: string; originalName?: string }> };
  /** Display label for pre-selected existing work (edit mode). */
  initialLabel?: string;
  /** Original (isMain-language) label rendered as dim secondary when different from initialLabel. */
  initialOriginalLabel?: string;
  /** Original work id in edit mode — used to scope artist editing to the untouched work. */
  originalWorkId?: number;
  /** Existing work's artists (edit mode) — prefilled into the editor when the
   *  user keeps the original work selected. */
  originalArtists?: ArtistCreditInitial[];
  /** Called in edit mode whenever the user mutates the existing work's artists. */
  onExistingArtistsChange?: (next: Credit[]) => void;
  /** Draft-restore slot for the CREATE-mode ArtistCreditsSection rows. */
  createArtistRows?: ArtistCreditRow[];
  /** Emits the full CREATE-mode editor row state (including incomplete rows). */
  onCreateArtistRowsChange?: (rows: ArtistCreditRow[]) => void;
  /** Draft-restore slot for the EDIT-mode ArtistCreditsSection rows. */
  editArtistRows?: ArtistCreditRow[];
  /** Emits the full EDIT-mode editor row state (including incomplete rows). */
  onEditArtistRowsChange?: (rows: ArtistCreditRow[]) => void;
  /** Shared local-artist pool surfaced in both ArtistCreditsSection instances. */
  localNewArtists?: LocalNewArtist[];
}

export function WorkSection(props: WorkSectionProps) {
  const [picked, setPicked] = createSignal<EntitySearchResult | null>(
    props.value?.kind === 'existing'
      ? {
          id: props.value.id,
          displayLabel: props.initialLabel ?? `Work #${props.value.id}`,
          originalLabel: props.initialOriginalLabel,
        }
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
    return r.data.map((w: {
      id: number;
      displayTitle: string;
      originalTitle?: string;
      artists?: Array<{ displayName: string; originalName?: string; role: string | null }>;
    }) => ({
      id: w.id,
      displayLabel: w.displayTitle,
      originalLabel: w.originalTitle,
      subLabel: (w.artists ?? []).length > 0
        ? w.artists!
            .map((a) => {
              const name = formatWithOriginal(a.displayName, a.originalName);
              return a.role ? `${name} (${a.role})` : name;
            })
            .join(', ')
        : undefined,
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
  // Titles are normalized (trim + drop empties) so empty rows from the seed
  // effect or trailing whitespace never leak into the server payload.
  createEffect(() => {
    if (!creating()) return;
    props.onChange({ kind: 'new', titles: normalizeTitles(titles()), artists: newArtists() });
  });

  // True iff user has the ORIGINAL existing work selected (edit mode, not reassigned).
  const editingOriginal = () =>
    props.originalWorkId !== undefined &&
    picked()?.id === props.originalWorkId &&
    !creating();

  return (
    <div class="kanade-admin-section">
      <div class="kanade-admin-section__title">Work</div>
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
        <div class="kanade-admin-subcard">
          <div class="kanade-admin-subcard__hint">새 Work 생성</div>
          <TitleI18nInput entity="work" titles={titles()} onChange={setTitles} />
          <ArtistCreditsSection
            ctx={props.ctx}
            context="work"
            credits={newArtists()}
            onChange={setNewArtists}
            initial={newArtists()}
            initialRows={props.createArtistRows}
            onRowsChange={props.onCreateArtistRowsChange}
            channelHint={props.channelHint}
            localNewArtists={props.localNewArtists}
          />
          <button
            type="button"
            class="kanade-admin-btn kanade-admin-btn--ghost"
            onClick={() => { setCreating(false); setNewArtists([]); props.onChange(null); }}
          >
            ← 검색으로 돌아가기
          </button>
        </div>
      </Show>
      <Show when={editingOriginal() && props.onExistingArtistsChange}>
        <ArtistCreditsSection
          ctx={props.ctx}
          context="work"
          credits={[]}
          onChange={props.onExistingArtistsChange!}
          initial={props.originalArtists ?? []}
          initialRows={props.editArtistRows}
          onRowsChange={props.onEditArtistRowsChange}
          channelHint={props.channelHint}
          localNewArtists={props.localNewArtists}
        />
      </Show>
    </div>
  );
}
