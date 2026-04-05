import type { SongItem } from '../types.js';

function findYouTubeVideoId(song: SongItem): string | null {
  const yt = song.videos.find((v) => v.platform === 'youtube');
  return yt?.externalId ?? null;
}

export function createVideoItem(song: SongItem): HTMLAnchorElement | null {
  const videoId = findYouTubeVideoId(song);
  if (!videoId) return null;

  const link = document.createElement('a');
  link.className = 'kanade-video-item';
  link.href = `/watch?v=${videoId}`;

  const thumb = document.createElement('img');
  thumb.className = 'kanade-video-thumb';
  thumb.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  thumb.loading = 'lazy';
  thumb.alt = song.title;

  const info = document.createElement('div');
  info.className = 'kanade-video-info';

  const title = document.createElement('div');
  title.className = 'kanade-video-title';
  title.textContent = song.title;

  const artist = document.createElement('div');
  artist.className = 'kanade-video-artist';
  artist.textContent = song.artists.map((a) => a.name).join(', ');

  info.appendChild(title);
  info.appendChild(artist);

  link.appendChild(thumb);
  link.appendChild(info);

  link.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = `/watch?v=${videoId}`;
  });

  return link;
}
