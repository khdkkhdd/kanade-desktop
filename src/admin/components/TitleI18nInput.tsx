import { createSignal, For, Show } from 'solid-js';
import type { TitleInput } from '../types.js';
import { detectLanguage } from '../lang-detect.js';

export interface TitleI18nInputProps {
  entity: 'work' | 'recording';
  titles: TitleInput[];
  onChange: (titles: TitleInput[]) => void;
  optional?: boolean;
}

const LANG_OPTIONS = [
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
];

export function TitleI18nInput(props: TitleI18nInputProps) {
  const [opened, setOpened] = createSignal(!props.optional || props.titles.length > 0);
  const [expanded, setExpanded] = createSignal(props.titles.length > 1);

  function updateMain(idx: number, title: string) {
    const next = props.titles.length === 0
      ? [{ title, language: detectLanguage(title), isMain: true }]
      : props.titles.map((t, i) => (i === idx ? { ...t, title } : t));
    props.onChange(next);
  }

  function updateLang(idx: number, language: string) {
    props.onChange(props.titles.map((t, i) => (i === idx ? { ...t, language } : t)));
  }

  function setIsMain(idx: number) {
    props.onChange(props.titles.map((t, i) => ({ ...t, isMain: i === idx })));
  }

  function addSecondary(language: string) {
    if (props.titles.some((t) => t.language === language)) return;
    props.onChange([...props.titles, { title: '', language, isMain: false }]);
  }

  function remove(idx: number) {
    const next = props.titles.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some((t) => t.isMain)) next[0].isMain = true;
    props.onChange(next);
  }

  const availableLangs = () =>
    LANG_OPTIONS.filter((l) => !props.titles.some((t) => t.language === l.code));

  return (
    <div>
      <Show when={props.optional && !opened()}>
        <button
          class="kanade-admin-btn"
          type="button"
          onClick={() => { setOpened(true); addSecondary(detectLanguage('')); }}
        >
          + Recording 전용 제목 추가
        </button>
        <div style="font-size: 12px; color: #888; margin-top: 4px;">현재 Work 제목 사용 중</div>
      </Show>
      <Show when={opened()}>
        <Show when={props.titles.length === 0}>
          <input
            class="kanade-admin-input"
            placeholder={props.entity === 'work' ? '주 제목 (예: 千本桜)' : '녹음 전용 제목'}
            onInput={(e) => updateMain(0, e.currentTarget.value)}
          />
        </Show>
        <For each={props.titles}>
          {(t, i) => (
            <div style="display: flex; gap: 6px; margin-bottom: 6px; align-items: center;">
              <input
                class="kanade-admin-input"
                style="flex: 1;"
                value={t.title}
                onInput={(e) => updateMain(i(), e.currentTarget.value)}
              />
              <select
                class="kanade-admin-input"
                style="width: 90px;"
                value={t.language}
                onChange={(e) => updateLang(i(), e.currentTarget.value)}
              >
                <For each={LANG_OPTIONS}>
                  {(l) => <option value={l.code}>{l.label}</option>}
                </For>
              </select>
              <button
                type="button"
                class="kanade-admin-btn"
                title="대표 제목"
                style={t.isMain ? 'background: #3a7aff; border-color: #3a7aff;' : ''}
                onClick={() => setIsMain(i())}
              >
                ★
              </button>
              <Show when={props.titles.length > 1 || props.optional}>
                <button type="button" class="kanade-admin-btn" onClick={() => remove(i())}>×</button>
              </Show>
            </div>
          )}
        </For>
        <Show when={expanded() && availableLangs().length > 0}>
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
        <Show when={!expanded() && availableLangs().length > 0}>
          <button type="button" class="kanade-admin-btn" style="margin-top: 6px;" onClick={() => setExpanded(true)}>
            ▸ 다른 언어 제목 추가
          </button>
        </Show>
      </Show>
    </div>
  );
}
