import { createSignal, createEffect, For, Index, Show } from 'solid-js';
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

  // Seed a default empty title so the <Index>-keyed row always exists,
  // preventing DOM unmount (and focus loss) on first character.
  createEffect(() => {
    if (opened() && props.titles.length === 0) {
      props.onChange([{ title: '', language: 'ja', isMain: true }]);
    }
  });

  function updateMain(idx: number, title: string) {
    props.onChange(props.titles.map((t, i) => {
      if (i !== idx) return t;
      // Auto-detect language only for the primary row (idx 0). Secondary
      // rows are added via explicit language buttons (e.g. "+ Korean") so
      // typing English into a ko row must NOT flip its language.
      const language = idx === 0 && t.title === '' && title !== ''
        ? detectLanguage(title)
        : t.language;
      return { ...t, title, language };
    }));
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
    // Collapse back to the "+ add title" button when the last row is removed
    // in optional mode; otherwise the seed effect (opened && empty) would
    // immediately resurrect a blank row.
    if (next.length === 0 && props.optional) setOpened(false);
    props.onChange(next);
  }

  const availableLangs = () =>
    LANG_OPTIONS.filter((l) => !props.titles.some((t) => t.language === l.code));

  return (
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <Show when={props.optional && !opened()}>
        <button
          class="kanade-admin-btn"
          type="button"
          onClick={() => setOpened(true)}
        >
          + Recording 전용 제목 추가
        </button>
        <div class="kanade-admin-meta">현재 Work 제목 사용 중</div>
      </Show>
      <Show when={opened()}>
        <Index each={props.titles}>
          {(t, i) => (
            <div class="kanade-admin-field-row">
              <input
                class="kanade-admin-input kanade-admin-field-row__grow"
                placeholder={i === 0 ? (props.entity === 'work' ? '주 제목 (예: 千本桜)' : '녹음 전용 제목') : ''}
                value={t().title}
                onInput={(e) => updateMain(i, e.currentTarget.value)}
              />
              <select
                class="kanade-admin-input kanade-admin-input--narrow"
                value={t().language}
                onChange={(e) => updateLang(i, e.currentTarget.value)}
              >
                <For each={LANG_OPTIONS}>
                  {(l) => <option value={l.code}>{l.label}</option>}
                </For>
              </select>
              <button
                type="button"
                class={`kanade-admin-btn kanade-admin-btn--icon${t().isMain ? ' kanade-admin-btn--star-active' : ''}`}
                title="대표 제목"
                onClick={() => setIsMain(i)}
              >
                ★
              </button>
              <Show when={props.titles.length > 1 || props.optional}>
                <button type="button" class="kanade-admin-btn kanade-admin-btn--icon" onClick={() => remove(i)}>×</button>
              </Show>
            </div>
          )}
        </Index>
        <Show when={expanded() && availableLangs().length > 0}>
          <div class="kanade-admin-field-row">
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
          <button type="button" class="kanade-admin-btn kanade-admin-btn--ghost" onClick={() => setExpanded(true)}>
            ▸ 다른 언어 제목 추가
          </button>
        </Show>
      </Show>
    </div>
  );
}
