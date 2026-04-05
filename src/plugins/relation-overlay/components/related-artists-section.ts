import type { RendererContext } from '../../../types/plugins.js';
import type {
  ArtistRef,
  ArtistRelationsResponse,
  SongItem,
  SongListResponse,
} from '../types.js';
import { createVideoItem } from './video-item.js';

const INITIAL_SHOW = 5;
const PAGE_LIMIT = 20;

interface ArtistState {
  songs: SongItem[];
  nextOffset: number | null;
  relationsLoaded: boolean;
  loading: boolean;
}

export function createRelatedArtistsSection(
  currentArtists: ArtistRef[],
  lang: string,
  ctx: RendererContext,
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'kanade-section kanade-section-divider';

  const title = document.createElement('div');
  title.className = 'kanade-section-title';
  title.textContent = '관련 아티스트';
  section.appendChild(title);

  const chipBar = document.createElement('div');
  chipBar.className = 'kanade-chip-bar';
  section.appendChild(chipBar);

  const songList = document.createElement('div');
  section.appendChild(songList);

  // Track all known artists and their state
  const artistMap = new Map<number, ArtistState>();
  const chipMap = new Map<number, HTMLButtonElement>();
  const knownArtistIds = new Set<number>();
  let selectedArtistId: number | null = null;

  function addArtistChip(artist: ArtistRef): void {
    if (knownArtistIds.has(artist.id)) return;
    knownArtistIds.add(artist.id);

    const chip = document.createElement('button');
    chip.className = 'kanade-chip';
    chip.textContent = artist.name;
    chip.addEventListener('click', () => void onChipClick(artist.id));
    chipBar.appendChild(chip);
    chipMap.set(artist.id, chip);
  }

  function renderSongs(): void {
    songList.innerHTML = '';
    if (selectedArtistId === null) return;

    const state = artistMap.get(selectedArtistId);
    if (!state) return;

    const showing = Math.min(INITIAL_SHOW, state.songs.length);
    for (let i = 0; i < showing; i++) {
      const item = createVideoItem(state.songs[i]);
      if (item) songList.appendChild(item);
    }

    // "더보기" to reveal remaining local items or fetch next page
    if (state.songs.length > INITIAL_SHOW || state.nextOffset !== null) {
      renderLoadMore(state);
    }
  }

  function renderAllSongs(state: ArtistState): void {
    songList.innerHTML = '';
    for (const song of state.songs) {
      const item = createVideoItem(song);
      if (item) songList.appendChild(item);
    }
    if (state.nextOffset !== null) {
      renderLoadMore(state);
    }
  }

  function renderLoadMore(state: ArtistState): void {
    const btn = document.createElement('button');
    btn.className = 'kanade-load-more';
    btn.textContent = '더보기';
    btn.addEventListener('click', () => void onLoadMore());
    songList.appendChild(btn);
  }

  async function onChipClick(artistId: number): Promise<void> {
    // Toggle off if same chip clicked
    if (selectedArtistId === artistId) {
      chipMap.get(artistId)?.classList.remove('active');
      selectedArtistId = null;
      songList.innerHTML = '';
      return;
    }

    // Deselect previous
    if (selectedArtistId !== null) {
      chipMap.get(selectedArtistId)?.classList.remove('active');
    }

    selectedArtistId = artistId;
    chipMap.get(artistId)?.classList.add('active');

    let state = artistMap.get(artistId);
    if (!state) {
      state = { songs: [], nextOffset: 0, relationsLoaded: false, loading: false };
      artistMap.set(artistId, state);
    }

    // Load songs if not yet loaded
    if (state.songs.length === 0 && state.nextOffset !== null) {
      await fetchArtistSongs(artistId, state);
    }

    // Load relations to discover more artists (one-time)
    if (!state.relationsLoaded) {
      state.relationsLoaded = true;
      void fetchArtistRelations(artistId);
    }

    renderSongs();
  }

  async function fetchArtistSongs(artistId: number, state: ArtistState): Promise<void> {
    if (state.loading || state.nextOffset === null) return;
    state.loading = true;
    try {
      const result = (await ctx.ipc.invoke('fetch-artist-songs', {
        artistId,
        lang,
        offset: state.nextOffset,
        limit: PAGE_LIMIT,
      })) as SongListResponse | null;

      if (result) {
        state.songs = state.songs.concat(result.data);
        state.nextOffset = result.nextOffset;
      } else {
        state.nextOffset = null;
      }
    } finally {
      state.loading = false;
    }
  }

  async function fetchArtistRelations(artistId: number): Promise<void> {
    const result = (await ctx.ipc.invoke('fetch-artist-relations', {
      artistId,
      lang,
    })) as ArtistRelationsResponse | null;

    if (!result) return;

    // Add discovered related artists as new chips
    for (const rel of [...result.from, ...result.to]) {
      addArtistChip(rel.artist);
    }
  }

  async function onLoadMore(): Promise<void> {
    if (selectedArtistId === null) return;
    const state = artistMap.get(selectedArtistId);
    if (!state) return;

    // If we only showed initial 5, reveal all local songs first
    const currentItems = songList.querySelectorAll('.kanade-video-item').length;
    if (currentItems < state.songs.length) {
      renderAllSongs(state);
      return;
    }

    // Fetch next page
    await fetchArtistSongs(selectedArtistId, state);
    if (selectedArtistId !== null) {
      renderAllSongs(state);
    }
  }

  // Initialize with current artists
  for (const artist of currentArtists) {
    addArtistChip(artist);
  }

  return section;
}
