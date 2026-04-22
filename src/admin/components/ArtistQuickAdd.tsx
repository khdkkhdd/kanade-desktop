import { For, Index, Show } from 'solid-js';
import type { NewArtistInput } from '../types.js';
import { ARTIST_LANG_OPTIONS, createArtistForm } from './artist-form.js';

export interface ArtistQuickAddProps {
  onSubmit: (artist: NewArtistInput) => Promise<void> | void;
  onCancel: () => void;
}

export function ArtistQuickAdd(props: ArtistQuickAddProps) {
  const form = createArtistForm();

  async function submit() {
    if (!form.isValid()) return;
    await props.onSubmit(form.buildPayload());
  }

  return (
    <div class="kanade-admin-subcard">
      <div class="kanade-admin-subcard__hint">새 아티스트</div>
      <div class="kanade-admin-field-row">
        <input
          class="kanade-admin-input kanade-admin-field-row__grow"
          placeholder="이름 (주 언어)"
          value={form.primaryName()}
          onInput={(e) => form.onPrimaryInput(e.currentTarget.value)}
        />
        <select
          class="kanade-admin-input kanade-admin-input--narrow"
          value={form.primaryLang()}
          onChange={(e) => form.setPrimaryLang(e.currentTarget.value)}
        >
          <For each={ARTIST_LANG_OPTIONS}>
            {(l) => <option value={l.code}>{l.label}</option>}
          </For>
        </select>
      </div>
      <div class="kanade-admin-radio-row">
        <span class="kanade-admin-radio-row__label">Type:</span>
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
            <div class="kanade-admin-field-row">
              <input
                class="kanade-admin-input kanade-admin-field-row__grow"
                placeholder={`다른 언어 이름 (${s().language})`}
                value={s().name}
                onInput={(e) => form.updateSecondary(i, e.currentTarget.value)}
              />
              <button type="button" class="kanade-admin-btn kanade-admin-btn--icon" onClick={() => form.removeSecondary(i)}>×</button>
            </div>
          )}
        </Index>
        <Show when={form.availableLangs().length > 0}>
          <div class="kanade-admin-field-row">
            <For each={form.availableLangs()}>
              {(l) => (
                <button type="button" class="kanade-admin-btn" onClick={() => form.addSecondary(l.code)}>
                  + {l.label}
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>
      <Show when={!form.expanded()}>
        <button type="button" class="kanade-admin-btn kanade-admin-btn--ghost" onClick={() => form.setExpanded(true)}>
          ▸ 다른 언어 이름 추가
        </button>
      </Show>
      <div class="kanade-admin-actions-end">
        <button type="button" class="kanade-admin-btn" onClick={props.onCancel}>취소</button>
        <button
          type="button"
          class="kanade-admin-btn kanade-admin-btn--primary"
          disabled={!form.isValid()}
          onClick={submit}
        >
          생성
        </button>
      </div>
    </div>
  );
}
