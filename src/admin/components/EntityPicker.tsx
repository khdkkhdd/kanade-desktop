import { createSignal, createEffect, For, Show } from 'solid-js';

export interface EntitySearchResult {
  id: number;
  displayLabel: string;
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
    <div style="position: relative;">
      <Show when={props.value}>
        {(v) => (
          <div style="padding: 8px 10px; background: #2a2a2a; border: 1px solid #3a7aff; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 13px;">{v().displayLabel}</div>
              <Show when={v().subLabel}>
                <div style="font-size: 11px; color: #888;">{v().subLabel}</div>
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
          <div style="position: absolute; top: 100%; left: 0; right: 0; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; max-height: 240px; overflow-y: auto; z-index: 10; margin-top: 2px;">
            <For each={results()}>
              {(r) => (
                <div
                  style="padding: 8px 10px; cursor: pointer; font-size: 13px; border-bottom: 1px solid #222;"
                  onMouseDown={(e) => { e.preventDefault(); props.onSelect(r); setQuery(''); }}
                >
                  <div>{r.displayLabel}</div>
                  <Show when={r.subLabel}>
                    <div style="font-size: 11px; color: #888;">{r.subLabel}</div>
                  </Show>
                </div>
              )}
            </For>
            <Show when={props.allowCreate}>
              <div
                style="padding: 8px 10px; cursor: pointer; font-size: 13px; color: #3a7aff; border-top: 1px solid #3a3a3a;"
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
