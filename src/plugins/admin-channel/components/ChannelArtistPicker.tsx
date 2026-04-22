import { createSignal, createEffect, For, Index, Show } from 'solid-js';
import type { NewArtistInput } from '../../../admin/types.js';
import { ARTIST_LANG_OPTIONS, createArtistForm } from '../../../admin/components/artist-form.js';

export interface ArtistSearchHit {
  id: number;
  displayName: string;
  originalName?: string;
  type?: string;
}

export interface ChannelArtistPickerProps {
  search: (q: string) => Promise<ArtistSearchHit[]>;
  onLink: (artistId: number) => void | Promise<void>;
  onCreateAndLink: (input: NewArtistInput) => void | Promise<void>;
  onCancel: () => void;
}

export function ChannelArtistPicker(props: ChannelArtistPickerProps) {
  const [mode, setMode] = createSignal<'search' | 'create'>('search');

  // Search state
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<ArtistSearchHit[]>([]);
  const [loading, setLoading] = createSignal(false);
  let debounce: ReturnType<typeof setTimeout> | null = null;

  createEffect(() => {
    const q = query();
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await props.search(q));
      } finally {
        setLoading(false);
      }
    }, 200);
  });

  // Create state (shared with ArtistQuickAdd via the form primitive).
  const form = createArtistForm();
  const [submitting, setSubmitting] = createSignal(false);

  async function submitCreate() {
    if (!form.isValid() || submitting()) return;
    setSubmitting(true);
    try {
      await props.onCreateAndLink(form.buildPayload());
    } finally {
      setSubmitting(false);
    }
  }

  function enterCreateMode() {
    // Seed primary name from the current search query so users don't
    // retype what they just searched for.
    form.reset(query().trim());
    setMode('create');
  }

  return (
    <div class="kanade-channel-picker">
      <Show when={mode() === 'search'}>
        <input
          class="kanade-channel-picker__input"
          placeholder="아티스트 이름 검색"
          autofocus
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />

        <div class="kanade-channel-picker__list">
          <Show when={!loading() && results().length === 0 && query().trim().length > 0}>
            <div class="kanade-channel-picker__empty">검색 결과 없음</div>
          </Show>
          <Show when={!loading() && query().trim().length === 0}>
            <div class="kanade-channel-picker__empty">이름을 입력해서 검색</div>
          </Show>
          <For each={results()}>
            {(r) => (
              <button
                type="button"
                class="kanade-channel-picker__item"
                onClick={() => props.onLink(r.id)}
              >
                <span class="kanade-channel-picker__item-name">
                  <span class="kanade-channel-picker__item-main">{r.displayName}</span>
                  <Show when={r.originalName && r.originalName !== r.displayName}>
                    <span class="kanade-channel-picker__item-original">{r.originalName}</span>
                  </Show>
                </span>
              </button>
            )}
          </For>
          <button
            type="button"
            class="kanade-channel-picker__create-trigger"
            onClick={enterCreateMode}
          >
            + 새 아티스트 만들기
            <Show when={query().trim()}>
              <span class="kanade-channel-picker__create-hint">"{query().trim()}"</span>
            </Show>
          </button>
        </div>
      </Show>

      <Show when={mode() === 'create'}>
        <div class="kanade-channel-picker__create-header">
          <button
            type="button"
            class="kanade-channel-picker__back"
            onClick={() => setMode('search')}
          >
            ← 검색으로
          </button>
          <span>새 아티스트</span>
        </div>

        <div class="kanade-channel-picker__create-row">
          <input
            class="kanade-channel-picker__input kanade-channel-picker__input--grow"
            placeholder="이름 (주 언어)"
            autofocus
            value={form.primaryName()}
            onInput={(e) => form.onPrimaryInput(e.currentTarget.value)}
          />
          <select
            class="kanade-channel-picker__select"
            value={form.primaryLang()}
            onChange={(e) => form.setPrimaryLang(e.currentTarget.value)}
          >
            <For each={ARTIST_LANG_OPTIONS}>
              {(l) => <option value={l.code}>{l.label}</option>}
            </For>
          </select>
        </div>

        <div class="kanade-channel-picker__type">
          <label>
            <input type="radio" checked={form.type() === 'solo'} onChange={() => form.setType('solo')} /> Solo
          </label>
          <label>
            <input type="radio" checked={form.type() === 'group'} onChange={() => form.setType('group')} /> Group
          </label>
        </div>

        <Show when={form.expanded()}>
          <Index each={form.secondaries()}>
            {(s, i) => (
              <div class="kanade-channel-picker__create-row">
                <input
                  class="kanade-channel-picker__input kanade-channel-picker__input--grow"
                  placeholder={`다른 언어 이름 (${s().language})`}
                  value={s().name}
                  onInput={(e) => form.updateSecondary(i, e.currentTarget.value)}
                />
                <button
                  type="button"
                  class="kanade-channel-picker__back"
                  onClick={() => form.removeSecondary(i)}
                  aria-label="이 언어 이름 제거"
                >×</button>
              </div>
            )}
          </Index>
          <Show when={form.availableLangs().length > 0}>
            <div class="kanade-channel-picker__lang-add-row">
              <For each={form.availableLangs()}>
                {(l) => (
                  <button
                    type="button"
                    class="kanade-channel-chip--ghost"
                    onClick={() => form.addSecondary(l.code)}
                  >
                    + {l.label}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </Show>
        <Show when={!form.expanded()}>
          <button
            type="button"
            class="kanade-channel-picker__back"
            style="align-self: flex-start;"
            onClick={() => form.setExpanded(true)}
          >
            ▸ 다른 언어 이름 추가
          </button>
        </Show>

        <div class="kanade-channel-picker__actions">
          <button
            type="button"
            class="kanade-channel-chip--ghost"
            onClick={props.onCancel}
          >
            취소
          </button>
          <button
            type="button"
            class="kanade-channel-chip--add"
            disabled={!form.isValid() || submitting()}
            onClick={submitCreate}
          >
            생성 & 연결
          </button>
        </div>
      </Show>
    </div>
  );
}
