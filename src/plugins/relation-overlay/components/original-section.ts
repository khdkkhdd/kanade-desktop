import type { RendererContext } from '../../../types/plugins.js';
import type { RecordingListItem, RecordingListResponse } from '../types.js';
import { createListSection } from './list-section.js';

const PAGE_LIMIT = 20;

// See covers-section.ts — identical rationale.
function playable(items: RecordingListItem[]): RecordingListItem[] {
  return items.filter((r) => r.mainVideo && r.mainVideo.platform === 'youtube');
}

/**
 * Original recordings of the current work, excluding the current recording.
 * /works/:workId/recordings?isOrigin=true&exclude=<currentRecordingId>
 * Empty results → returns null so the chip stays hidden.
 */
export async function createOriginalSection(
  workId: number,
  currentRecordingId: number,
  lang: string,
  ctx: RendererContext,
): Promise<HTMLElement | null> {
  const first = (await ctx.ipc.invoke('fetch-work-recordings', {
    workId,
    lang,
    isOrigin: true,
    exclude: currentRecordingId,
    offset: 0,
    limit: PAGE_LIMIT,
  })) as RecordingListResponse | null;

  if (!first) return null;
  const initialPlayable = playable(first.data);
  if (initialPlayable.length === 0 && first.nextOffset === null) return null;

  let nextOffset = first.nextOffset;
  const seed = first.seed;
  let loading = false;

  const list = createListSection(async () => {
    if (loading || nextOffset === null) return;
    loading = true;
    try {
      const more = (await ctx.ipc.invoke('fetch-work-recordings', {
        workId,
        lang,
        isOrigin: true,
        exclude: currentRecordingId,
        seed,
        offset: nextOffset,
        limit: PAGE_LIMIT,
      })) as RecordingListResponse | null;
      if (more && more.data.length > 0) {
        nextOffset = more.nextOffset;
        list.appendItems(playable(more.data));
        if (nextOffset === null) list.setNoMore();
      } else {
        nextOffset = null;
        list.setNoMore();
      }
    } finally {
      loading = false;
    }
  });

  list.appendItems(initialPlayable);
  if (nextOffset === null) list.setNoMore();

  if (initialPlayable.length === 0 && nextOffset === null) return null;

  return list.root;
}

// Synchronous variant for cases where the caller already has initial data.
export function createOriginalSectionFromData(items: RecordingListItem[]): HTMLElement {
  const list = createListSection(async () => {});
  list.appendItems(items);
  list.setNoMore();
  return list.root;
}
