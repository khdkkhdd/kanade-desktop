import { createSignal, For, Show } from 'solid-js';
import type { NewArtistInput, ArtistNameInput } from '../types.js';
import { detectLanguage } from '../lang-detect.js';

export interface ArtistQuickAddProps {
  onSubmit: (artist: NewArtistInput) => Promise<void> | void;
  onCancel: () => void;
}

const LANG_OPTIONS = [
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
];

export function ArtistQuickAdd(props: ArtistQuickAddProps) {
  const [primaryName, setPrimaryName] = createSignal('');
  const [primaryLang, setPrimaryLang] = createSignal<string>('ja');
  const [type, setType] = createSignal<'solo' | 'group'>('solo');
  const [secondaries, setSecondaries] = createSignal<ArtistNameInput[]>([]);
  const [expanded, setExpanded] = createSignal(false);

  function onPrimaryInput(v: string) {
    setPrimaryName(v);
    if (v) setPrimaryLang(detectLanguage(v));
  }

  function addSecondary(code: string) {
    if (secondaries().some((s) => s.language === code)) return;
    if (primaryLang() === code) return;
    setSecondaries([...secondaries(), { name: '', language: code, isMain: false }]);
  }

  function updateSecondary(i: number, name: string) {
    setSecondaries(secondaries().map((s, idx) => (idx === i ? { ...s, name } : s)));
  }

  function removeSecondary(i: number) {
    setSecondaries(secondaries().filter((_, idx) => idx !== i));
  }

  const availableLangs = () =>
    LANG_OPTIONS.filter(
      (l) => l.code !== primaryLang() && !secondaries().some((s) => s.language === l.code),
    );

  async function submit() {
    if (!primaryName().trim()) return;
    const names: ArtistNameInput[] = [
      { name: primaryName().trim(), language: primaryLang(), isMain: true },
      ...secondaries().filter((s) => s.name.trim()).map((s) => ({ ...s, name: s.name.trim() })),
    ];
    await props.onSubmit({ type: type(), names });
  }

  return (
    <div style="padding: 12px; background: #262626; border-radius: 6px; margin: 8px 0;">
      <div class="kanade-admin-section__title">새 아티스트</div>
      <div style="display: flex; gap: 6px; margin-bottom: 8px;">
        <input
          class="kanade-admin-input"
          style="flex: 1;"
          placeholder="이름 (주 언어)"
          value={primaryName()}
          onInput={(e) => onPrimaryInput(e.currentTarget.value)}
        />
        <select
          class="kanade-admin-input"
          style="width: 90px;"
          value={primaryLang()}
          onChange={(e) => setPrimaryLang(e.currentTarget.value)}
        >
          <For each={LANG_OPTIONS}>
            {(l) => <option value={l.code}>{l.label}</option>}
          </For>
        </select>
      </div>
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
        <label style="font-size: 12px; color: #aaa;">Type:</label>
        <label style="font-size: 13px;">
          <input type="radio" checked={type() === 'solo'} onChange={() => setType('solo')} /> Solo
        </label>
        <label style="font-size: 13px;">
          <input type="radio" checked={type() === 'group'} onChange={() => setType('group')} /> Group
        </label>
      </div>
      <Show when={expanded()}>
        <For each={secondaries()}>
          {(s, i) => (
            <div style="display: flex; gap: 6px; margin-bottom: 6px;">
              <input
                class="kanade-admin-input"
                style="flex: 1;"
                placeholder={`다른 언어 이름 (${s.language})`}
                value={s.name}
                onInput={(e) => updateSecondary(i(), e.currentTarget.value)}
              />
              <button type="button" class="kanade-admin-btn" onClick={() => removeSecondary(i())}>×</button>
            </div>
          )}
        </For>
        <Show when={availableLangs().length > 0}>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <For each={availableLangs()}>
              {(l) => (
                <button type="button" class="kanade-admin-btn" onClick={() => addSecondary(l.code)}>
                  + {l.label}
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>
      <Show when={!expanded()}>
        <button type="button" class="kanade-admin-btn" onClick={() => setExpanded(true)}>
          ▸ 다른 언어 이름 추가
        </button>
      </Show>
      <div style="display: flex; gap: 6px; margin-top: 12px; justify-content: flex-end;">
        <button type="button" class="kanade-admin-btn" onClick={props.onCancel}>취소</button>
        <button
          type="button"
          class="kanade-admin-btn kanade-admin-btn--primary"
          disabled={!primaryName().trim()}
          onClick={submit}
        >
          생성
        </button>
      </div>
    </div>
  );
}
