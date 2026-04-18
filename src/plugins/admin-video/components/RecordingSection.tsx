import { createSignal, createEffect, createResource, For, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { RecordingSelection, TitleInput, WorkSelection, ArtistCreditInput, NewArtistInput } from '../../../admin/types.js';
import { TitleI18nInput } from '../../../admin/components/TitleI18nInput.js';
import { ArtistCreditsSection } from './ArtistCreditsSection.js';

type ArtistCreditEntry = ArtistCreditInput | { newArtist: NewArtistInput; role: string | null; isPublic: boolean };

export interface RecordingSectionProps {
  ctx: RendererContext;
  work: WorkSelection;
  value: RecordingSelection | null;
  onChange: (v: RecordingSelection | null) => void;
  channelHint?: { channelExternalId: string; artists: Array<{ id: number; displayName: string }> };
}

export function RecordingSection(props: RecordingSectionProps) {
  const [mode, setMode] = createSignal<'list' | 'create'>('list');
  const [titles, setTitles] = createSignal<TitleInput[]>([]);
  const [isOrigin, setIsOrigin] = createSignal(true);
  const [artists, setArtists] = createSignal<ArtistCreditEntry[]>([]);

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
      return (r.data.recordings ?? []) as Array<{ id: number; displayTitle: string; isOrigin: boolean }>;
    },
  );

  function pickExisting(r: { id: number }) {
    props.onChange({ kind: 'existing', id: r.id });
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
    setIsOrigin(true);
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
      <Show when={mode() === 'list' && props.work.kind === 'existing'}>
        <div style="max-height: 240px; overflow-y: auto; margin-bottom: 8px;">
          <For each={existingRecs() ?? []}>
            {(r) => (
              <div
                style="padding: 8px 10px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; margin-bottom: 4px; cursor: pointer; display: flex; justify-content: space-between;"
                onClick={() => pickExisting(r)}
              >
                <span style="font-size: 13px;">{r.displayTitle}</span>
                <Show when={r.isOrigin}>
                  <span style="font-size: 10px; background: #3a7aff; padding: 2px 6px; border-radius: 3px;">원곡</span>
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
