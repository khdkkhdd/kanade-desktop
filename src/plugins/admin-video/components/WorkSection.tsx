import { createSignal, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { WorkSelection, TitleInput } from '../../../admin/types.js';
import { EntityPicker, type EntitySearchResult } from '../../../admin/components/EntityPicker.js';
import { TitleI18nInput } from '../../../admin/components/TitleI18nInput.js';

export interface WorkSectionProps {
  ctx: RendererContext;
  value: WorkSelection | null;
  onChange: (v: WorkSelection | null) => void;
}

export function WorkSection(props: WorkSectionProps) {
  const [picked, setPicked] = createSignal<EntitySearchResult | null>(null);
  const [creating, setCreating] = createSignal(false);
  const [titles, setTitles] = createSignal<TitleInput[]>([]);

  async function search(q: string): Promise<EntitySearchResult[]> {
    const r = (await props.ctx.ipc.invoke('search-works', { q })) as any;
    if (!r?.ok) return [];
    return r.data.map((w: { id: number; displayTitle: string }) => ({
      id: w.id,
      displayLabel: w.displayTitle,
    }));
  }

  function onPick(item: EntitySearchResult | null) {
    setPicked(item);
    if (item) {
      props.onChange({ kind: 'existing', id: item.id });
      setCreating(false);
    } else {
      props.onChange(null);
    }
  }

  function onCreateRequested() {
    setCreating(true);
    setTitles([]);
    setPicked(null);
    props.onChange({ kind: 'new', titles: [], artists: [] });
  }

  function onTitlesChange(t: TitleInput[]) {
    setTitles(t);
    props.onChange({ kind: 'new', titles: t, artists: [] });
  }

  return (
    <div class="kanade-admin-section">
      <div class="kanade-admin-section__title">📝 Work</div>
      <Show when={!creating()}>
        <EntityPicker
          entityType="work"
          value={picked()}
          onSelect={onPick}
          onCreateRequested={onCreateRequested}
          allowCreate={true}
          search={search}
        />
      </Show>
      <Show when={creating()}>
        <div style="background: #262626; padding: 10px; border-radius: 6px;">
          <div style="font-size: 12px; color: #aaa; margin-bottom: 6px;">새 Work 생성</div>
          <TitleI18nInput entity="work" titles={titles()} onChange={onTitlesChange} />
          <button
            type="button"
            class="kanade-admin-btn"
            style="margin-top: 8px;"
            onClick={() => { setCreating(false); props.onChange(null); }}
          >
            검색으로 돌아가기
          </button>
        </div>
      </Show>
    </div>
  );
}
