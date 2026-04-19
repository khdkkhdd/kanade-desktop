import type { RendererContext } from '../../../types/plugins.js';
import type { RecordingListItem, RecordingListResponse } from '../types.js';
import { isSupportedPlatform } from '../utils.js';
import { createListSection } from './list-section.js';

const PAGE_LIMIT = 20;

// Recordings whose mainVideo is on an unsupported platform can't be rendered
// as cards, so they shouldn't count toward "does this section have anything to
// show". Without this filter a chip with zero cards can still render when
// every returned recording lacks a renderable mainVideo link.
function playable(items: RecordingListItem[]): RecordingListItem[] {
  return items.filter((r) => r.mainVideo && isSupportedPlatform(r.mainVideo.platform));
}

/**
 * Cover recordings of the current work.
 * /works/:workId/recordings?isOrigin=false&exclude=<currentRecordingId>
 */
export async function createCoversSection(
  workId: number,
  currentRecordingId: number,
  lang: string,
  ctx: RendererContext,
): Promise<HTMLElement | null> {
  const first = (await ctx.ipc.invoke('fetch-work-recordings', {
    workId,
    lang,
    isOrigin: false,
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
        isOrigin: false,
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

  // If the first page had only orphan recordings but more pages exist, we
  // still return the section and let the scroll handler keep fetching until
  // real items appear or pagination ends.
  if (initialPlayable.length === 0 && nextOffset === null) return null;

  return list.root;
}
