import { createResource, createSignal, For, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { NewArtistInput } from '../../../admin/types.js';
import { EntityPicker, type EntitySearchResult } from '../../../admin/components/EntityPicker.js';
import { ArtistQuickAdd } from '../../../admin/components/ArtistQuickAdd.js';

export interface ChannelWidgetProps {
  ctx: RendererContext;
  externalId: string;
  channelName: string;
}

export function ChannelWidget(props: ChannelWidgetProps) {
  const [reloadToken, setReloadToken] = createSignal(0);
  const [showPicker, setShowPicker] = createSignal(false);
  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const [state] = createResource(
    () => [props.externalId, reloadToken()] as const,
    async ([id]) => {
      const r = (await props.ctx.ipc.invoke('get-channel', { externalId: id })) as any;
      if (!r?.ok) return { artists: [] };
      return { artists: r.data?.artists ?? [] };
    },
  );

  async function search(q: string): Promise<EntitySearchResult[]> {
    const r = (await props.ctx.ipc.invoke('search-artists', { q })) as any;
    if (!r?.ok) return [];
    return r.data.map((a: any) => ({ id: a.id, displayLabel: a.displayName, subLabel: a.type }));
  }

  async function link(artistId: number) {
    setError(null);
    const r = (await props.ctx.ipc.invoke('link-artist', {
      externalId: props.externalId, artistId,
    })) as any;
    if (r?.ok) { setShowPicker(false); setReloadToken((x) => x + 1); }
    else setError(r?.error?.message ?? 'Link failed');
  }

  async function createAndLink(artist: NewArtistInput) {
    setError(null);
    const r = (await props.ctx.ipc.invoke('create-artist-and-link', {
      externalId: props.externalId, newArtist: artist,
    })) as any;
    if (r?.ok) { setShowPicker(false); setCreating(false); setReloadToken((x) => x + 1); }
    else setError(r?.error?.message ?? 'Create+link failed');
  }

  async function unlink(artistId: number) {
    if (!confirm('이 아티스트와의 연결을 해제할까요?')) return;
    const r = (await props.ctx.ipc.invoke('unlink-artist', {
      externalId: props.externalId, artistId,
    })) as any;
    if (r?.ok) setReloadToken((x) => x + 1);
    else setError(r?.error?.message ?? 'Unlink failed');
  }

  return (
    <div style="background: rgba(40,40,40,0.9); padding: 8px 12px; border-radius: 8px; display: inline-flex; gap: 8px; align-items: center; flex-wrap: wrap; color: #fff;">
      <span style="font-size: 12px; color: #aaa;">Kanade:</span>
      <For each={state()?.artists ?? []}>
        {(a: any) => (
          <span style="display: inline-flex; gap: 4px; align-items: center; background: #3a7aff; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
            {a.displayName ?? `#${a.id}`}
            <button
              type="button"
              style="background: none; border: 0; color: #fff; cursor: pointer; font-size: 14px; line-height: 1;"
              onClick={() => unlink(a.id)}
            >×</button>
          </span>
        )}
      </For>
      <Show when={!showPicker()}>
        <button class="kanade-admin-btn" onClick={() => setShowPicker(true)}>
          + 아티스트 연결
        </button>
      </Show>
      <Show when={showPicker() && !creating()}>
        <div style="min-width: 280px;">
          <EntityPicker
            entityType="artist"
            value={null}
            onSelect={(item) => item && link(item.id)}
            onCreateRequested={() => setCreating(true)}
            allowCreate={true}
            search={search}
          />
          <button class="kanade-admin-btn" style="margin-top: 6px;" onClick={() => setShowPicker(false)}>
            취소
          </button>
        </div>
      </Show>
      <Show when={creating()}>
        <div style="min-width: 320px;">
          <ArtistQuickAdd
            onSubmit={createAndLink}
            onCancel={() => setCreating(false)}
          />
        </div>
      </Show>
      <Show when={error()}>
        <div class="kanade-admin-banner kanade-admin-banner--error" style="margin-left: 8px;">
          {error()}
        </div>
      </Show>
    </div>
  );
}
