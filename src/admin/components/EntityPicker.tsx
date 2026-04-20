import { createSignal, createEffect, For, Show } from 'solid-js';

export interface EntitySearchResult {
  id: number;
  displayLabel: string;
  /** Original (isMain-language) label rendered as a dim secondary line
   *  when different from the ko-preferred displayLabel. */
  originalLabel?: string;
  subLabel?: string;
}

export interface EntityPickerProps {
  entityType: 'work' | 'recording' | 'artist';
  workId?: number;
  value: EntitySearchResult | null;
  onSelect: (item: EntitySearchResult | null) => void;
  onCreateRequested: () => void;
  allowCreate: boolean;
  search: (q: string) => Promise<EntitySearchResult[]>;
}

export function EntityPicker(props: EntityPickerProps) {
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<EntitySearchResult[]>([]);
  const [focused, setFocused] = createSignal(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  createEffect(() => {
    const q = query();
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const rs = await props.search(q);
      setResults(rs);
    }, 250);
  });

  return (
    <div class="kanade-admin-picker">
      <Show when={props.value}>
        {(v) => (
          <div class="kanade-admin-picker__selected">
            <div style="min-width: 0;">
              <div class="kanade-admin-picker__selected-main">{v().displayLabel}</div>
              <Show when={v().originalLabel && v().originalLabel !== v().displayLabel}>
                <div class="kanade-admin-picker__selected-sub kanade-admin-picker__selected-sub--original">{v().originalLabel}</div>
              </Show>
              <Show when={v().subLabel}>
                <div class="kanade-admin-picker__selected-sub">{v().subLabel}</div>
              </Show>
            </div>
            <button
              type="button"
              class="kanade-admin-btn"
              onClick={() => { props.onSelect(null); setQuery(''); }}
            >
              변경
            </button>
          </div>
        )}
      </Show>
      <Show when={!props.value}>
        <input
          class="kanade-admin-input"
          placeholder={`${props.entityType} 검색...`}
          value={query()}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
        <Show when={focused()}>
          <div class="kanade-admin-popover">
            <For each={results()}>
              {(r) => (
                <div
                  class="kanade-admin-popover__item"
                  onMouseDown={(e) => { e.preventDefault(); props.onSelect(r); setQuery(''); }}
                >
                  <div>{r.displayLabel}</div>
                  <Show when={r.originalLabel && r.originalLabel !== r.displayLabel}>
                    <div class="kanade-admin-popover__item-sub kanade-admin-popover__item-sub--original">{r.originalLabel}</div>
                  </Show>
                  <Show when={r.subLabel}>
                    <div class="kanade-admin-popover__item-sub">{r.subLabel}</div>
                  </Show>
                </div>
              )}
            </For>
            <Show when={props.allowCreate}>
              <div
                class="kanade-admin-popover__create"
                onMouseDown={(e) => { e.preventDefault(); props.onCreateRequested(); }}
              >
                + 새 {props.entityType} 만들기
              </div>
            </Show>
          </div>
        </Show>
      </Show>
    </div>
  );
}
