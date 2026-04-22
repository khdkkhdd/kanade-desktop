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
    return suggestions().filter((r) => r.includes(v));
  };

  return (
    <div class="kanade-admin-picker">
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
        <div class="kanade-admin-popover">
          <For each={filtered()}>
            {(r) => (
              <div
                class="kanade-admin-popover__item"
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
