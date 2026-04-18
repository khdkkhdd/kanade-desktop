import type { RendererContext } from '../../../types/plugins.js';
import type { RecordingListResponse } from '../types.js';
import { createListSection } from './list-section.js';

const PAGE_LIMIT = 20;

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

  if (!first || first.data.length === 0) return null;

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
        list.appendItems(more.data);
        if (nextOffset === null) list.setNoMore();
      } else {
        nextOffset = null;
        list.setNoMore();
      }
    } finally {
      loading = false;
    }
  });

  list.appendItems(first.data);
  if (nextOffset === null) list.setNoMore();

  return list.root;
}
