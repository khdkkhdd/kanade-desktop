import { createSignal, createEffect, createResource, For, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { RecordingSelection, TitleInput, WorkSelection, ArtistCreditInput, NewArtistInput } from '../../../admin/types.js';
import { TitleI18nInput } from '../../../admin/components/TitleI18nInput.js';
import { normalizeTitles } from '../../../admin/title-utils.js';
import { ArtistCreditsSection, type ArtistCreditInitial } from './ArtistCreditsSection.js';

type ArtistCreditEntry = ArtistCreditInput | { newArtist: NewArtistInput; role: string | null; isPublic: boolean };

export interface RecordingSectionProps {
  ctx: RendererContext;
  work: WorkSelection;
  value: RecordingSelection | null;
  onChange: (v: RecordingSelection | null) => void;
  channelHint?: { artists: Array<{ id: number; displayName: string }> };
  /** Display label for pre-selected existing recording (edit mode). */
  initialLabel?: string;
  /** Original (isMain-language) label shown as dim secondary when different from initialLabel. */
  initialOriginalLabel?: string;
  /** Original recording id in edit mode — artist edit UI is only shown when
   *  the user keeps the untouched recording selected. */
  originalRecordingId?: number;
  /** Existing recording's artists (edit mode) — prefilled. */
  originalArtists?: ArtistCreditInitial[];
  /** Called when the user mutates the existing recording's artists. */
  onExistingArtistsChange?: (next: ArtistCreditEntry[]) => void;
}

type ViewMode = 'list' | 'create' | 'selected';

export function RecordingSection(props: RecordingSectionProps) {
  // When draft restores with new-recording in progress, start in create mode
  // with the captured title/isOrigin/artist state.
  const [mode, setMode] = createSignal<ViewMode>(
    props.value?.kind === 'existing'
      ? 'selected'
      : props.value?.kind === 'new'
        ? 'create'
        : 'list',
  );
  const [titles, setTitles] = createSignal<TitleInput[]>(
    props.value?.kind === 'new' ? props.value.titles : [],
  );
  const [isOrigin, setIsOrigin] = createSignal(
    props.value?.kind === 'new' ? props.value.isOrigin : false,
  );
  const [artists, setArtists] = createSignal<ArtistCreditEntry[]>(
    props.value?.kind === 'new' ? props.value.artists : [],
  );

  // If new work, auto-enter create mode. A brand-new work can't have any
  // existing recordings yet, so default isOrigin → true (skip when a draft
  // has already captured the user's own choice).
  createEffect(() => {
    if (props.work.kind !== 'new') return;
    setMode('create');
    if (props.value?.kind !== 'new') setIsOrigin(true);
  });

  const [existingRecs] = createResource(
    () => (props.work.kind === 'existing' ? props.work.id : null),
    async (workId) => {
      if (workId == null) return [];
      const r = (await props.ctx.ipc.invoke('get-work', { id: workId })) as any;
      if (!r?.ok) return [];
      return (r.data.recordings ?? []) as Array<{
        id: number;
        displayTitle: string;
        originalTitle?: string;
        isOrigin: boolean;
        artists: Array<{ id: number; displayName: string; originalName?: string; role: string | null; isPublic: boolean }>;
      }>;
    },
  );

  function pickExisting(r: { id: number }) {
    props.onChange({ kind: 'existing', id: r.id });
    setMode('selected');
  }

  // Auto-emit when in create mode and state changes. Titles are normalized
  // (trim + drop empties) so seed-only / whitespace-only rows never reach
  // the server, which is what lets recordings legitimately carry zero titles
  // (falling back to the work's titles in display).
  createEffect(() => {
    if (mode() !== 'create') return;
    props.onChange({
      kind: 'new',
      isOrigin: isOrigin(),
      titles: normalizeTitles(titles()),
      artists: artists(),
    });
  });

  function enterCreate() {
    setMode('create');
    setTitles([]);
    // First recording on a work is overwhelmingly the origin; covers come
    // later. Default true when the work has no existing recordings.
    setIsOrigin((existingRecs() ?? []).length === 0);
    setArtists([]);
    // createEffect picks this up automatically
  }

  function updateArtists(next: ArtistCreditEntry[]) {
    setArtists(next);
  }

  function updateTitles(t: TitleInput[]) {
    setTitles(t);
  }

  function updateIsOrigin(v: boolean) {
    setIsOrigin(v);
  }

  return (
    <div class="kanade-admin-section">
      <div class="kanade-admin-section__title">Recording</div>
      <Show when={mode() === 'selected' && props.value?.kind === 'existing'}>
        <div class="kanade-admin-selected-pill">
          <div style="min-width: 0;">
            <div class="kanade-admin-picker__selected-main">
              {props.initialLabel ?? `Recording #${(props.value as { kind: 'existing'; id: number }).id}`}
            </div>
            <Show when={props.initialOriginalLabel && props.initialOriginalLabel !== props.initialLabel}>
              <div class="kanade-admin-picker__selected-sub">{props.initialOriginalLabel}</div>
            </Show>
          </div>
          <button
            type="button"
            class="kanade-admin-btn"
            onClick={() => { props.onChange(null); setMode('list'); }}
          >
            변경
          </button>
        </div>
        <Show
          when={
            props.originalRecordingId !== undefined &&
            props.value?.kind === 'existing' &&
            (props.value as { kind: 'existing'; id: number }).id === props.originalRecordingId &&
            props.onExistingArtistsChange
          }
        >
          <ArtistCreditsSection
            ctx={props.ctx}
            context="recording"
            credits={[]}
            onChange={props.onExistingArtistsChange!}
            initial={props.originalArtists ?? []}
            channelHint={props.channelHint}
          />
        </Show>
      </Show>
      <Show when={mode() === 'list' && props.work.kind === 'existing'}>
        <div class="kanade-admin-list">
          <For each={existingRecs() ?? []}>
            {(r) => (
              <div class="kanade-admin-list__item" onClick={() => pickExisting(r)}>
                <div class="kanade-admin-list__item-main">
                  <span class="kanade-admin-list__item-title">{r.displayTitle}</span>
                  <Show when={r.originalTitle && r.originalTitle !== r.displayTitle}>
                    <span class="kanade-admin-list__item-original">{r.originalTitle}</span>
                  </Show>
                  <Show when={r.artists.length > 0}>
                    <span class="kanade-admin-list__item-sub">
                      {r.artists
                        .map((a) => (a.role ? `${a.displayName} (${a.role})` : a.displayName))
                        .join(', ')}
                    </span>
                  </Show>
                </div>
                <Show when={r.isOrigin}>
                  <span class="kanade-admin-badge kanade-admin-badge--origin">원곡</span>
                </Show>
              </div>
            )}
          </For>
        </div>
        <button type="button" class="kanade-admin-btn" onClick={enterCreate}>
          + 새 Recording 만들기
        </button>
      </Show>
      <Show when={mode() === 'create'}>
        <div class="kanade-admin-subcard">
          <div class="kanade-admin-subcard__hint">새 Recording 생성</div>
          <label class="kanade-admin-inline-label">
            <input type="checkbox" checked={isOrigin()} onChange={(e) => updateIsOrigin(e.currentTarget.checked)} />
            isOrigin (원곡)
          </label>
          <TitleI18nInput entity="recording" titles={titles()} onChange={updateTitles} optional={true} />
          <ArtistCreditsSection
            ctx={props.ctx}
            context="recording"
            credits={artists()}
            onChange={updateArtists}
            channelHint={props.channelHint}
            initial={artists()}
          />
          <Show when={props.work.kind === 'existing'}>
            <button
              type="button"
              class="kanade-admin-btn kanade-admin-btn--ghost"
              onClick={() => { setMode('list'); props.onChange(null); }}
            >
              ← 기존 목록으로 돌아가기
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
}
