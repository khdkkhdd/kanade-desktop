import type { VideoResponse, SongItem } from '../types.js';
import { createVideoItem } from './video-item.js';

const INITIAL_SHOW = 5;

export function createOriginalSection(
  songs: VideoResponse['songs'],
): HTMLElement | null {
  // Collect all cover_of relations and resolve them against the songs array
  const originals: SongItem[] = [];
  const seen = new Set<number>();

  for (const song of songs) {
    for (const rel of song.relations) {
      if (rel.type !== 'cover_of') continue;
      if (seen.has(rel.song.id)) continue;
      seen.add(rel.song.id);

      // The relation's song only has { id, title, originalTitle } — no videos/artists.
      // Try to find the full song in the songs array (the original might also appear
      // as a song entry if it shares the same video).
      const fullSong = songs.find((s) => s.id === rel.song.id);
      if (fullSong) {
        originals.push(fullSong);
      }
      // If the original song isn't in the songs array, we cannot render a video item
      // because we lack video and artist data. This is a known limitation —
      // the initial /video response doesn't include full original song details.
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
