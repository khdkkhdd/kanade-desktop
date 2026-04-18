import { createSignal, For, Show } from 'solid-js';

const WORK_ROLES = ['composer', 'lyricist', 'arranger'];
const RECORDING_ROLES = ['vocal', 'arranger', 'instrument', 'mix', 'mastering'];

export interface RoleAutocompleteProps {
  context: 'work' | 'recording';
  value: string | null;
  onChange: (v: string | null) => void;
}

export function RoleAutocomplete(props: RoleAutocompleteProps) {
  const [showList, setShowList] = createSignal(false);
  const suggestions = () => (props.context === 'work' ? WORK_ROLES : RECORDING_ROLES);
  const filtered = () => {
    const v = (props.value ?? '').toLowerCase();
    return suggestions().filter((r) => r.startsWith(v));
  };

  return (
    <div style="position: relative;">
      <input
        class="kanade-admin-input"
        type="text"
        placeholder="role"
        value={props.value ?? ''}
        onFocus={() => setShowList(true)}
        onBlur={() => setTimeout(() => setShowList(false), 150)}
        onInput={(e) => props.onChange(e.currentTarget.value || null)}
      />
      <Show when={showList() && filtered().length > 0}>
        <div style="position: absolute; top: 100%; left: 0; right: 0; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; z-index: 10; max-height: 180px; overflow-y: auto;">
          <For each={filtered()}>
            {(r) => (
              <div
                style="padding: 6px 10px; cursor: pointer; font-size: 13px;"
                onMouseDown={(e) => { e.preventDefault(); props.onChange(r); setShowList(false); }}
              >
                {r}
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
