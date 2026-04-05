import type { RendererContext } from '../../../types/plugins.js';
import type { SongItem, SongListResponse } from '../types.js';
import { createVideoItem } from './video-item.js';

const INITIAL_SHOW = 5;
const PAGE_LIMIT = 20;

export function createOtherVersionsSection(
  initialSongs: SongItem[],
  songGroupId: number,
  lang: string,
  currentVideoId: string,
  ctx: RendererContext,
): HTMLElement | null {
  // Filter out the current video
  const songs = initialSongs.filter(
    (s) => !s.videos.some((v) => v.platform === 'youtube' && v.externalId === currentVideoId),
  );

  if (songs.length === 0) return null;

  const section = document.createElement('div');
  section.className = 'kanade-section kanade-section-divider';

  const title = document.createElement('div');
  title.className = 'kanade-section-title';
  title.textContent = '이 곡의 다른 영상';
  section.appendChild(title);

  const list = document.createElement('div');
  section.appendChild(list);

  let allSongs = [...songs];
  let showing = Math.min(INITIAL_SHOW, allSongs.length);
  let nextOffset: number | null = null;
  let hasInitializedPagination = false;
  let loading = false;

  function renderItems(): void {
    list.innerHTML = '';
    for (let i = 0; i < showing; i++) {
      const item = createVideoItem(allSongs[i]);
      if (item) list.appendChild(item);
    }

    // Show "더보기" if there are hidden local items or more pages to fetch
    if (showing < allSongs.length || nextOffset !== null) {
      const btn = document.createElement('button');
      btn.className = 'kanade-load-more';
      btn.textContent = '더보기';
      btn.addEventListener('click', () => void loadMore());
      list.appendChild(btn);
    }
  }

  async function loadMore(): Promise<void> {
    if (loading) return;

    // First, reveal any locally hidden items
    if (showing < allSongs.length) {
      showing = allSongs.length;
      renderItems();
      return;
    }

    // Then fetch next page via IPC
    if (nextOffset === null) return;

    loading = true;
    try {
      const result = (await ctx.ipc.invoke('fetch-song-group-covers', {
        songGroupId,
        lang,
        offset: nextOffset,
        limit: PAGE_LIMIT,
      })) as SongListResponse | null;

      if (result) {
        const newSongs = result.data.filter(
          (s) => !s.videos.some((v) => v.platform === 'youtube' && v.externalId === currentVideoId),
        );
        allSongs = allSongs.concat(newSongs);
        showing = allSongs.length;
        nextOffset = result.nextOffset;
      } else {
        nextOffset = null;
      }
    } finally {
      loading = false;
    }
    renderItems();
  }

  // Initialize pagination info from initial data set
  // The initial songs come from the panel's IPC fetch; we store the offset for subsequent pages
  function setNextOffset(offset: number | null): void {
    nextOffset = offset;
    hasInitializedPagination = true;
    renderItems();
  }

  renderItems();

  // Expose setter for panel to provide pagination info
  (section as HTMLElement & { setNextOffset: typeof setNextOffset }).setNextOffset = setNextOffset;

  return section;
}
