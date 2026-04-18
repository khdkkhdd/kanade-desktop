import type { RendererContext } from '../../../types/plugins.js';
import type { RecordingItem, RecordingListResponse } from '../types.js';
import { createVideoItem } from './video-item.js';

const INITIAL_SHOW = 5;
const PAGE_LIMIT = 20;

export function createOtherVideosOfRecordingSection(
  initialRecordings: RecordingItem[],
  workId: number,
  lang: string,
  currentVideoId: string,
  ctx: RendererContext,
  sectionTitle = '이 곡의 다른 영상',
  ipcChannel = 'fetch-work-originals',
): HTMLElement | null {
  // Filter out the current video
  const recordings = initialRecordings.filter(
    (s) => !s.videos.some((v) => v.platform === 'youtube' && v.externalId === currentVideoId),
  );

  if (recordings.length === 0) return null;

  const section = document.createElement('div');
  section.className = 'kanade-section kanade-section-divider';

  const title = document.createElement('div');
  title.className = 'kanade-section-title';
  title.textContent = sectionTitle;
  section.appendChild(title);

  const list = document.createElement('div');
  section.appendChild(list);

  let allRecordings = [...recordings];
  let showing = Math.min(INITIAL_SHOW, allRecordings.length);
  let nextOffset: number | null = initialRecordings.length < PAGE_LIMIT ? null : initialRecordings.length;
  let loading = false;

  function renderItems(): void {
    list.innerHTML = '';
    for (let i = 0; i < showing; i++) {
      const item = createVideoItem(allRecordings[i]);
      if (item) list.appendChild(item);
    }

    if (showing < allRecordings.length || nextOffset !== null) {
      const btn = document.createElement('button');
      btn.className = 'kanade-load-more';
      btn.textContent = '더보기';
      btn.addEventListener('click', () => void loadMore());
      list.appendChild(btn);
    }
  }

  async function loadMore(): Promise<void> {
    if (loading) return;

    if (showing < allRecordings.length) {
      showing = allRecordings.length;
      renderItems();
      return;
    }

    if (nextOffset === null) return;

    loading = true;
    try {
      const result = (await ctx.ipc.invoke(ipcChannel, {
        workId,
        lang,
        offset: nextOffset,
        limit: PAGE_LIMIT,
      })) as RecordingListResponse | null;

      if (result) {
        const newRecordings = result.data.filter(
          (s) => !s.videos.some((v) => v.platform === 'youtube' && v.externalId === currentVideoId),
        );
        allRecordings = allRecordings.concat(newRecordings);
        showing = allRecordings.length;
        nextOffset = result.nextOffset;
      } else {
        nextOffset = null;
      }
    } finally {
      loading = false;
    }
    renderItems();
  }

  renderItems();
  return section;
}
