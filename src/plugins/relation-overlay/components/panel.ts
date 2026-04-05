import type { RendererContext } from '../../../types/plugins.js';
import type { VideoResponse, SongListResponse } from '../types.js';
import { getStyles } from '../styles.js';
import { createOriginalSection } from './original-section.js';
import { createOtherVersionsSection } from './other-versions-section.js';
import { createRelatedArtistsSection } from './related-artists-section.js';

const PANEL_ID = 'kanade-relation-panel';
const STYLE_ID = 'kanade-relation-styles';
const INITIAL_PAGE_LIMIT = 20;

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = getStyles();
  document.head.appendChild(style);
}

export async function createPanel(
  data: VideoResponse,
  videoId: string,
  lang: string,
  ctx: RendererContext,
): Promise<HTMLElement> {
  injectStyles();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.className = 'kanade-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'kanade-header';

  const headerTitle = document.createElement('span');
  headerTitle.className = 'kanade-header-title';
  headerTitle.textContent = 'kanade';

  const headerLine = document.createElement('div');
  headerLine.className = 'kanade-header-line';

  header.appendChild(headerTitle);
  header.appendChild(headerLine);
  panel.appendChild(header);

  // Original section (if any song is a cover)
  const originalSection = createOriginalSection(data.songs);
  if (originalSection) {
    panel.appendChild(originalSection);
  }

  // Other versions section — find a song group and fetch covers
  const songWithGroup = data.songs.find((s) => s.songGroup);
  if (songWithGroup) {
    const songGroupId = songWithGroup.songGroup.id;

    // Fetch initial page of song group covers
    const coversResult = (await ctx.ipc.invoke('fetch-song-group-covers', {
      songGroupId,
      lang,
      offset: 0,
      limit: INITIAL_PAGE_LIMIT,
    })) as SongListResponse | null;

    if (coversResult && coversResult.data.length > 0) {
      const otherVersions = createOtherVersionsSection(
        coversResult.data,
        songGroupId,
        lang,
        videoId,
        ctx,
      );

      if (otherVersions) {
        // Provide pagination offset from the fetch result
        const withOffset = otherVersions as HTMLElement & {
          setNextOffset?: (offset: number | null) => void;
        };
        withOffset.setNextOffset?.(coversResult.nextOffset);
        panel.appendChild(otherVersions);
      }
    }
  }

  // Related artists section (always shown if there are artists)
  const allArtists = data.songs.flatMap((s) => s.artists);
  const uniqueArtists = allArtists.filter(
    (a, i, arr) => arr.findIndex((b) => b.id === a.id) === i,
  );

  if (uniqueArtists.length > 0) {
    const artistSection = createRelatedArtistsSection(uniqueArtists, lang, ctx);
    panel.appendChild(artistSection);
  }

  return panel;
}

export function removePanel(): void {
  document.getElementById(PANEL_ID)?.remove();
}
