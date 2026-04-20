import { createResource, createSignal, For, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { NewArtistInput } from '../../../admin/types.js';
import { ChannelArtistPicker, type ArtistSearchHit } from './ChannelArtistPicker.js';

export interface ChannelWidgetProps {
  ctx: RendererContext;
  externalId: string;
  channelName: string;
}

export function ChannelWidget(props: ChannelWidgetProps) {
  const [reloadToken, setReloadToken] = createSignal(0);
  const [showPicker, setShowPicker] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const [state] = createResource(
    () => [props.externalId, reloadToken()] as const,
    async ([id]) => {
      const r = (await props.ctx.ipc.invoke('get-channel', { externalId: id })) as any;
      if (!r?.ok) return { artists: [] };
      return { artists: r.data?.artists ?? [] };
    },
  );

  async function search(q: string): Promise<ArtistSearchHit[]> {
    const r = (await props.ctx.ipc.invoke('search-artists', { q })) as any;
    if (!r?.ok) return [];
    return r.data.map((a: any) => ({
      id: a.id,
      displayName: a.displayName,
      originalName: a.originalName,
    }));
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
    if (r?.ok) { setShowPicker(false); setReloadToken((x) => x + 1); }
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
    <div class="kanade-channel-widget">
      <div class="kanade-channel-widget__row">
        <Show
          when={(state()?.artists ?? []).length > 0}
          fallback={
            <Show when={!showPicker()}>
              <span class="kanade-channel-widget__empty">연결된 아티스트 없음</span>
            </Show>
          }
        >
          <For each={state()?.artists ?? []}>
            {(a: any) => (
              <span class="kanade-channel-chip">
                <span class="kanade-channel-chip__label">
                  <span class="kanade-channel-chip__main">{a.displayName ?? `#${a.artistId}`}</span>
                  <Show when={a.originalName && a.originalName !== a.displayName}>
                    <span class="kanade-channel-chip__original">{a.originalName}</span>
                  </Show>
                </span>
                <button
                  type="button"
                  class="kanade-channel-chip__remove"
                  title="연결 해제"
                  onClick={() => unlink(a.artistId)}
                >×</button>
              </span>
            )}
          </For>
        </Show>
        <Show when={!showPicker()}>
          <button class="kanade-channel-chip--add" onClick={() => setShowPicker(true)}>
            + 아티스트 연결
          </button>
        </Show>
        <Show when={showPicker()}>
          <button
            class="kanade-channel-chip--ghost"
            onClick={() => setShowPicker(false)}
          >
            취소
          </button>
        </Show>
      </div>

      <Show when={showPicker()}>
        <ChannelArtistPicker
          search={search}
          onLink={link}
          onCreateAndLink={createAndLink}
          onCancel={() => setShowPicker(false)}
        />
      </Show>

      <Show when={error()}>
        <div class="kanade-admin-banner kanade-admin-banner--error">
          {error()}
        </div>
      </Show>
    </div>
  );
}
