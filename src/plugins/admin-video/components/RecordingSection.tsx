import { createSignal, createEffect, createResource, For, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { RecordingSelection, TitleInput, WorkSelection, ArtistCreditInput, NewArtistInput } from '../../../admin/types.js';
import { TitleI18nInput } from '../../../admin/components/TitleI18nInput.js';
import { ArtistCreditsSection, type ArtistCreditInitial } from './ArtistCreditsSection.js';

type ArtistCreditEntry = ArtistCreditInput | { newArtist: NewArtistInput; role: string | null; isPublic: boolean };

export interface RecordingSectionProps {
  ctx: RendererContext;
  work: WorkSelection;
  value: RecordingSelection | null;
  onChange: (v: RecordingSelection | null) => void;
  channelHint?: { channelExternalId: string; artists: Array<{ id: number; displayName: string }> };
  /** Display label for pre-selected existing recording (edit mode). */
  initialLabel?: string;
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

  // If new work, auto-enter create mode
  createEffect(() => {
    if (props.work.kind === 'new') setMode('create');
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
        isOrigin: boolean;
        artists: Array<{ id: number; displayName: string; role: string | null; isPublic: boolean }>;
      }>;
    },
  );

  function pickExisting(r: { id: number }) {
    props.onChange({ kind: 'existing', id: r.id });
    setMode('selected');
  }

  // Auto-emit when in create mode and state changes
  createEffect(() => {
    if (mode() !== 'create') return;
    props.onChange({
      kind: 'new',
      isOrigin: isOrigin(),
      titles: titles(),
      artists: artists(),
    });
  });

  function enterCreate() {
    setMode('create');
    setTitles([]);
    setIsOrigin(false);
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
      <div class="kanade-admin-section__title">🎤 Recording</div>
      <Show when={mode() === 'selected' && props.value?.kind === 'existing'}>
        <div style="padding: 8px 10px; background: #2a2a2a; border: 1px solid #3a7aff; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 13px;">
            {props.initialLabel ?? `Recording #${(props.value as { kind: 'existing'; id: number }).id}`}
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
          <div style="margin-top: 10px;">
            <ArtistCreditsSection
              ctx={props.ctx}
              context="recording"
              credits={[]}
              onChange={props.onExistingArtistsChange!}
              initial={props.originalArtists ?? []}
              channelHint={props.channelHint}
            />
          </div>
        </Show>
      </Show>
      <Show when={mode() === 'list' && props.work.kind === 'existing'}>
        <div style="max-height: 240px; overflow-y: auto; margin-bottom: 8px;">
          <For each={existingRecs() ?? []}>
            {(r) => (
              <div
                style="padding: 8px 10px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; margin-bottom: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;"
                onClick={() => pickExisting(r)}
              >
                <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1;">
                  <span style="font-size: 13px;">{r.displayTitle}</span>
                  <Show when={r.artists.length > 0}>
                    <span style="font-size: 11px; color: #9a9a9a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      {r.artists
                        .map((a) => (a.role ? `${a.displayName} (${a.role})` : a.displayName))
                        .join(', ')}
                    </span>
                  </Show>
                </div>
                <Show when={r.isOrigin}>
                  <span style="font-size: 10px; background: #3a7aff; padding: 2px 6px; border-radius: 3px; flex-shrink: 0;">원곡</span>
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
        <div style="background: #262626; padding: 10px; border-radius: 6px;">
          <label style="display: flex; gap: 8px; align-items: center; font-size: 13px; margin-bottom: 8px;">
            <input type="checkbox" checked={isOrigin()} onChange={(e) => updateIsOrigin(e.currentTarget.checked)} />
            isOrigin (원곡)
          </label>
          <TitleI18nInput entity="recording" titles={titles()} onChange={updateTitles} optional={true} />
          <div style="margin-top: 10px;">
            <ArtistCreditsSection
              ctx={props.ctx}
              context="recording"
              credits={artists()}
              onChange={updateArtists}
              channelHint={props.channelHint}
              initial={artists()}
            />
          </div>
          <Show when={props.work.kind === 'existing'}>
            <button
              type="button"
              class="kanade-admin-btn"
              style="margin-top: 8px;"
              onClick={() => { setMode('list'); props.onChange(null); }}
            >
              기존 목록으로 돌아가기
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
}
