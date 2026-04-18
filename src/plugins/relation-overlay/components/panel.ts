import type { RendererContext } from '../../../types/plugins.js';
import type { VideoResponse, RecordingItem, RecordingListResponse, ArtistRelationsResponse } from '../types.js';
import { getStyles } from '../styles.js';
import { createVideoItem } from './video-item.js';

const PANEL_ID = 'kanade-relation-panel';
const STYLE_ID = 'kanade-relation-styles';
const INITIAL_SHOW = 5;
const PAGE_LIMIT = 20;

interface TopChipDef {
  id: string;
  label: string;
  load: () => Promise<void>;
}

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

  // Top-level chip bar
  const topChipBar = document.createElement('div');
  topChipBar.className = 'kanade-chip-bar';
  panel.appendChild(topChipBar);

  // Sub chip bar (for artist chips, hidden by default)
  const subChipBar = document.createElement('div');
  subChipBar.className = 'kanade-chip-bar kanade-sub-chip-bar';
  subChipBar.style.display = 'none';
  panel.appendChild(subChipBar);

  // Content area
  const content = document.createElement('div');
  content.className = 'kanade-content';
  panel.appendChild(content);

  // State
  const topChips: TopChipDef[] = [];
  const topChipElements = new Map<string, HTMLButtonElement>();
  let activeTopChipId: string | null = null;

  // Recording list state
  let allRecordings: RecordingItem[] = [];

  let nextOffset: number | null = null;
  let currentIpcChannel: string | null = null;
  let currentFetchParams: Record<string, unknown> | null = null;
  let loading = false;

  // Artist sub-chip state
  const artistChipElements = new Map<number, HTMLButtonElement>();
  const discoveredArtistIds = new Set<number>();
  let activeArtistId: number | null = null;
  const artistRecordingsCache = new Map<
    number,
    { recordings: RecordingItem[]; nextOffset: number | null }
  >();
  const artistRelationsLoaded = new Set<number>();

  // Field names `songs` / `songGroup` on the /video response are preserved by
  // the server (PR 1 kept the wire shape), so we still access them by those
  // names even though our local types use Recording/Work naming.
  const recording = data.songs[0];
  if (!recording) return panel;

  const workId = recording.songGroup?.id;

  // --- Render functions ---

  let scrollObserver: IntersectionObserver | null = null;

  function renderContent(): void {
    content.innerHTML = '';
    scrollObserver?.disconnect();

    for (const r of allRecordings) {
      const item = createVideoItem(r);
      if (item) content.appendChild(item);
    }

    // Infinite scroll sentinel
    if (nextOffset !== null && currentIpcChannel) {
      const sentinel = document.createElement('div');
      sentinel.className = 'kanade-scroll-sentinel';
      content.appendChild(sentinel);

      scrollObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) void fetchMore();
        },
        { root: content, threshold: 0.1 },
      );
      scrollObserver.observe(sentinel);
    }
  }

  async function fetchMore(): Promise<void> {
    if (loading || nextOffset === null || !currentIpcChannel || !currentFetchParams) return;

    loading = true;
    try {
      const result = (await ctx.ipc.invoke(currentIpcChannel, {
        ...currentFetchParams,
        offset: nextOffset,
        limit: PAGE_LIMIT,
      })) as RecordingListResponse | null;

      if (result) {
        const newRecordings = result.data.filter(
          (s) => !s.videos.some((v) => v.platform === 'youtube' && v.externalId === videoId),
        );
        // Append items without re-rendering everything
        const sentinel = content.querySelector('.kanade-scroll-sentinel');
        for (const r of newRecordings) {
          const item = createVideoItem(r);
          if (item) content.insertBefore(item, sentinel);
        }
        allRecordings = allRecordings.concat(newRecordings);
        nextOffset = result.nextOffset;

        // Remove sentinel if no more pages
        if (nextOffset === null) {
          scrollObserver?.disconnect();
          sentinel?.remove();
        }
      } else {
        nextOffset = null;
        scrollObserver?.disconnect();
        content.querySelector('.kanade-scroll-sentinel')?.remove();
      }
    } finally {
      loading = false;
    }
  }

  // --- Top chip management ---

  function setChipActive(chipDiv: HTMLElement, active: boolean): void {
    if (active) {
      chipDiv.classList.remove('ytChipShapeInactive');
      chipDiv.classList.add('ytChipShapeActive');
    } else {
      chipDiv.classList.remove('ytChipShapeActive');
      chipDiv.classList.add('ytChipShapeInactive');
    }
  }

  function selectTopChip(chipId: string): void {
    if (activeTopChipId === chipId) return;

    if (activeTopChipId) {
      const prev = topChipElements.get(activeTopChipId);
      if (prev) setChipActive(prev.querySelector('.ytChipShapeChip')!, false);
    }

    activeTopChipId = chipId;
    const curr = topChipElements.get(chipId);
    if (curr) setChipActive(curr.querySelector('.ytChipShapeChip')!, true);

    // Hide sub chip bar for non-artist chips
    if (chipId !== 'artists') {
      subChipBar.style.display = 'none';
      activeArtistId = null;
      for (const el of artistChipElements.values()) {
        setChipActive(el.querySelector('.ytChipShapeChip')!, false);
      }
    }

    const chip = topChips.find((c) => c.id === chipId);
    if (chip) void chip.load();
  }

  function createChipElement(label: string, onClick: () => void, inactive = true): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'ytChipShapeButtonReset';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', inactive ? 'false' : 'true');

    const chipDiv = document.createElement('div');
    chipDiv.className = `ytChipShapeChip ${inactive ? 'ytChipShapeInactive' : 'ytChipShapeActive'} ytChipShapeOnlyTextPadding`;

    const textDiv = document.createElement('div');
    textDiv.textContent = label;
    chipDiv.appendChild(textDiv);

    btn.appendChild(chipDiv);
    btn.addEventListener('click', onClick);
    return btn;
  }

  function addTopChip(def: TopChipDef): void {
    topChips.push(def);
    const btn = createChipElement(def.label, () => selectTopChip(def.id));
    topChipBar.appendChild(btn);
    topChipElements.set(def.id, btn);
  }

  // --- Artist sub-chip management ---

  function addArtistSubChip(artistId: number, name: string): void {
    if (discoveredArtistIds.has(artistId)) return;
    discoveredArtistIds.add(artistId);

    const btn = createChipElement(name, () => void selectArtist(artistId));
    subChipBar.appendChild(btn);
    artistChipElements.set(artistId, btn);
  }

  async function selectArtist(artistId: number): Promise<void> {
    if (activeArtistId === artistId) return;

    if (activeArtistId !== null) {
      const prev = artistChipElements.get(activeArtistId);
      if (prev) setChipActive(prev.querySelector('.ytChipShapeChip')!, false);
    }

    activeArtistId = artistId;
    const curr = artistChipElements.get(artistId);
    if (curr) setChipActive(curr.querySelector('.ytChipShapeChip')!, true);

    // Fetch recordings if not cached
    if (!artistRecordingsCache.has(artistId)) {
      const result = (await ctx.ipc.invoke('fetch-artist-recordings', {
        artistId,
        lang,
        offset: 0,
        limit: PAGE_LIMIT,
      })) as RecordingListResponse | null;

      artistRecordingsCache.set(artistId, {
        recordings: result?.data ?? [],
        nextOffset: result?.nextOffset ?? null,
      });
    }

    const cache = artistRecordingsCache.get(artistId)!;
    allRecordings = cache.recordings;
    nextOffset = cache.nextOffset;
    currentIpcChannel = 'fetch-artist-recordings';
    currentFetchParams = { artistId, lang };
    renderContent();

    // Discover related artists (one-time)
    if (!artistRelationsLoaded.has(artistId)) {
      artistRelationsLoaded.add(artistId);
      const raw = (await ctx.ipc.invoke('fetch-artist-relations', {
        artistId,
        lang,
      })) as { data: ArtistRelationsResponse } | null;

      const relations = raw?.data;
      if (relations) {
        for (const rel of [...relations.from, ...relations.to]) {
          addArtistSubChip(rel.artist.id, rel.artist.name);
        }
      }
    }
  }

  // --- Build top chips ---

  // 1. 원곡 (if cover)
  // Note: `song.relations` / `rel.song` field names preserved to match the
  // server's /video response wire shape.
  const coverOfRelations = recording.relations.filter((r) => r.type === 'cover_of');
  if (coverOfRelations.length > 0) {
    addTopChip({
      id: 'originals',
      label: '원곡',
      load: async () => {
        const originals = coverOfRelations.map((r) => r.song).filter(
          (s) => !s.videos.some((v) => v.platform === 'youtube' && v.externalId === videoId),
        );
        allRecordings = originals;

        nextOffset = null;
        currentIpcChannel = null;
        currentFetchParams = null;
        renderContent();
      },
    });
  }

  // 2. 이 곡의 다른 영상 (other originals in work)
  if (workId) {
    const originalsResult = (await ctx.ipc.invoke('fetch-work-originals', {
      workId,
      lang,
      offset: 0,
      limit: PAGE_LIMIT,
    })) as RecordingListResponse | null;

    const otherOriginals = originalsResult?.data.filter(
      (s) => !s.videos.some((v) => v.platform === 'youtube' && v.externalId === videoId),
    ) ?? [];

    if (otherOriginals.length > 0) {
      addTopChip({
        id: 'other-versions',
        label: '이 곡의 다른 영상',
        load: async () => {
          allRecordings = otherOriginals;

          nextOffset = originalsResult?.nextOffset ?? null;
          currentIpcChannel = 'fetch-work-originals';
          currentFetchParams = { workId, lang };
          renderContent();
        },
      });
    }
  }

  // 3. 커버
  if (workId) {
    const coversResult = (await ctx.ipc.invoke('fetch-work-covers', {
      workId,
      lang,
      offset: 0,
      limit: PAGE_LIMIT,
    })) as RecordingListResponse | null;

    const covers = coversResult?.data.filter(
      (s) => !s.videos.some((v) => v.platform === 'youtube' && v.externalId === videoId),
    ) ?? [];

    if (covers.length > 0) {
      addTopChip({
        id: 'covers',
        label: '커버',
        load: async () => {
          allRecordings = covers;

          nextOffset = coversResult?.nextOffset ?? null;
          currentIpcChannel = 'fetch-work-covers';
          currentFetchParams = { workId, lang };
          renderContent();
        },
      });
    }
  }

  // 4. 아티스트의 다른 곡 (top chip that reveals sub-chips)
  // Note: `recording.artists` — `artists` field preserved to match the
  // server's /video response wire shape.
  const currentArtists = recording.artists.filter((a) => a.id);
  if (currentArtists.length > 0) {
    // Pre-populate sub chips
    for (const artist of currentArtists) {
      addArtistSubChip(artist.id, artist.name);
    }

    addTopChip({
      id: 'artists',
      label: '아티스트의 다른 곡',
      load: async () => {
        subChipBar.style.display = 'flex';
        // Auto-select first artist if none selected
        if (activeArtistId === null && currentArtists.length > 0) {
          await selectArtist(currentArtists[0].id);
        } else if (activeArtistId !== null) {
          // Re-render current artist's recordings
          await selectArtist(activeArtistId);
        }
      },
    });
  }

  // Don't render empty panel
  if (topChips.length === 0) return panel;

  // Auto-select first chip
  selectTopChip(topChips[0].id);

  return panel;
}

export function removePanel(): void {
  document.getElementById(PANEL_ID)?.remove();
}
