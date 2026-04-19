import { createSignal, createEffect, For, Show } from 'solid-js';
import type { NewArtistInput } from '../../../admin/types.js';
import { detectLanguage } from '../../../admin/lang-detect.js';

export interface ArtistSearchHit {
  id: number;
  displayName: string;
  type?: string;
}

export interface ChannelArtistPickerProps {
  search: (q: string) => Promise<ArtistSearchHit[]>;
  onLink: (artistId: number) => void | Promise<void>;
  onCreateAndLink: (input: NewArtistInput) => void | Promise<void>;
  onCancel: () => void;
}

const LANG_OPTIONS = [
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
];

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

  // Create-mode state
  const [name, setName] = createSignal('');
  const [lang, setLang] = createSignal('ja');
  const [type, setType] = createSignal<'solo' | 'group'>('solo');
  const [submitting, setSubmitting] = createSignal(false);

  function onNameInput(v: string) {
    setName(v);
    if (v) setLang(detectLanguage(v));
  }

  async function submitCreate() {
    if (!name().trim() || submitting()) return;
    setSubmitting(true);
    try {
      await props.onCreateAndLink({
        type: type(),
        names: [{ name: name().trim(), language: lang(), isMain: true }],
      });
    } finally {
      setSubmitting(false);
    }
  }

  function enterCreateMode() {
    setName(query());
    if (query()) setLang(detectLanguage(query()));
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
                <span class="kanade-channel-picker__item-name">{r.displayName}</span>
                <Show when={r.type}>
                  <span class="kanade-channel-picker__item-type">{r.type}</span>
                </Show>
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
            placeholder="이름"
            autofocus
            value={name()}
            onInput={(e) => onNameInput(e.currentTarget.value)}
          />
          <select
            class="kanade-channel-picker__select"
            value={lang()}
            onChange={(e) => setLang(e.currentTarget.value)}
          >
            <For each={LANG_OPTIONS}>
              {(l) => <option value={l.code}>{l.label}</option>}
            </For>
          </select>
        </div>

        <div class="kanade-channel-picker__type">
          <label>
            <input type="radio" checked={type() === 'solo'} onChange={() => setType('solo')} /> Solo
          </label>
          <label>
            <input type="radio" checked={type() === 'group'} onChange={() => setType('group')} /> Group
          </label>
        </div>

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
            disabled={!name().trim() || submitting()}
            onClick={submitCreate}
          >
            생성 & 연결
          </button>
        </div>
      </Show>
    </div>
  );
}
