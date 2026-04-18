import type { VideoResponse, RecordingItem } from '../types.js';
import { createVideoItem } from './video-item.js';

const INITIAL_SHOW = 5;

export function createOriginalSection(
  // Field name `songs` preserved to match the server's /video response wire shape.
  recordings: VideoResponse['songs'],
): HTMLElement | null {
  // Collect all cover_of relations — relation.song now includes full data (videos, artists).
  // Note: `rel.song` field name preserved to match the server's /video response wire shape.
  const originals: RecordingItem[] = [];
  const seen = new Set<number>();

  for (const recording of recordings) {
    for (const rel of recording.relations) {
      if (rel.type !== 'cover_of') continue;
      if (seen.has(rel.song.id)) continue;
      seen.add(rel.song.id);
      originals.push(rel.song);
    }
  }

  if (originals.length === 0) return null;

  const section = document.createElement('div');
  section.className = 'kanade-section';

  const label = document.createElement('div');
  label.className = 'kanade-section-title';
  label.textContent = '원곡';
  section.appendChild(label);

  const list = document.createElement('div');
  section.appendChild(list);

  let showing = Math.min(INITIAL_SHOW, originals.length);

  function renderItems(): void {
    list.innerHTML = '';
    for (let i = 0; i < showing; i++) {
      const item = createVideoItem(originals[i]);
      if (item) list.appendChild(item);
    }

    if (showing < originals.length) {
      const btn = document.createElement('button');
      btn.className = 'kanade-load-more';
      btn.textContent = `더보기 (${originals.length - showing}개 더)`;
      btn.addEventListener('click', () => {
        showing = originals.length;
        renderItems();
      });
      list.appendChild(btn);
    }
  }

  renderItems();
  return section;
}
