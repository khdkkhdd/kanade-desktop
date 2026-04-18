import type { RendererContext } from '../../../types/plugins.js';
import type {
  ArtistCredit,
  ArtistRelation,
  RecordingListResponse,
  VideoRecording,
} from '../types.js';
import { createListSection } from './list-section.js';

const PAGE_LIMIT = 20;

interface SubChipDef {
  artistId: number;
  name: string;
}

interface SubChipState {
  element: HTMLButtonElement;
  relationsLoaded: boolean;
}

export interface ArtistSectionParts {
  subChips: HTMLElement; // inline chip group to place right after the artist top-chip
  content: HTMLElement;  // card list to place in the content area
}

/**
 * Artist chip bar — one sub-chip per artist (work creators ∪ recording artists,
 * deduped by artistId, performers first). Returns two elements so the panel
 * can inline the sub-chips next to the "아티스트" top-chip and keep the card
 * list in the content region.
 */
export async function createArtistSection(
  recording: VideoRecording,
  lang: string,
  ctx: RendererContext,
): Promise<ArtistSectionParts | null> {
  const credits = collectVisibleCredits(recording);
  if (credits.length === 0) return null;

  const subChips = document.createElement('div');
  subChips.className = 'kanade-artist-subchips';

  const content = document.createElement('div');
  content.className = 'kanade-artist-list-holder';

  const chipStates = new Map<number, SubChipState>();
  // Cache per-artist card-list DOM so revisiting a sub-chip restores the
  // exact same cards in the same seeded-random order (instead of re-fetching
  // with a fresh server seed and reshuffling).
  const bodyCache = new Map<number, HTMLElement>();
  let activeArtistId: number | null = null;

  function addSubChip(def: SubChipDef): void {
    if (chipStates.has(def.artistId)) return;
    const btn = createSubChip(def.name, () => void activateChip(def));
    subChips.appendChild(btn);
    chipStates.set(def.artistId, { element: btn, relationsLoaded: false });
  }

  async function activateChip(def: SubChipDef): Promise<void> {
    if (activeArtistId === def.artistId) return;
    if (activeArtistId !== null) {
      const prev = chipStates.get(activeArtistId);
      if (prev) setChipActive(prev.element, false);
    }
    activeArtistId = def.artistId;
    const state = chipStates.get(def.artistId);
    if (!state) return;
    setChipActive(state.element, true);

    content.innerHTML = '';
    let body = bodyCache.get(def.artistId);
    if (!body) {
      body = await renderRecordingsList(def.artistId, lang, ctx);
      bodyCache.set(def.artistId, body);
    }
    content.appendChild(body);

    if (!state.relationsLoaded) {
      state.relationsLoaded = true;
      void loadRelatedChips(def.artistId, ctx, lang, addSubChip);
    }
  }

  const initialChips: SubChipDef[] = credits.map((c) => ({ artistId: c.artistId, name: c.name }));
  for (const def of initialChips) addSubChip(def);
  if (initialChips.length > 0) await activateChip(initialChips[0]);

  return { subChips, content };
}

// Combine recording artists + work creators (performers first, then creators),
// dedup by artistId. Fall back to hidden credits when every credit is
// is_public=false.
function collectVisibleCredits(recording: VideoRecording): ArtistCredit[] {
  const all: ArtistCredit[] = [...recording.artists, ...recording.work.creators];
  const byId = new Map<number, ArtistCredit>();
  for (const c of all) {
    const existing = byId.get(c.artistId);
    if (!existing) byId.set(c.artistId, { ...c });
    else existing.isPublic = existing.isPublic || c.isPublic;
  }
  const deduped = [...byId.values()];
  const visible = deduped.filter((c) => c.isPublic);
  return visible.length > 0 ? visible : deduped;
}

function createSubChip(name: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'ytChipShapeButtonReset kanade-artist-subchip';
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', 'false');

  const chipDiv = document.createElement('div');
  chipDiv.className = 'ytChipShapeChip ytChipShapeInactive ytChipShapeOnlyTextPadding';

  const text = document.createElement('div');
  text.textContent = name;
  chipDiv.appendChild(text);

  btn.appendChild(chipDiv);
  btn.addEventListener('click', onClick);
  return btn;
}

function setChipActive(btn: HTMLButtonElement, active: boolean): void {
  const chipDiv = btn.querySelector('.ytChipShapeChip');
  if (!chipDiv) return;
  chipDiv.classList.toggle('ytChipShapeActive', active);
  chipDiv.classList.toggle('ytChipShapeInactive', !active);
  btn.setAttribute('aria-selected', active ? 'true' : 'false');
}

async function renderRecordingsList(
  artistId: number,
  lang: string,
  ctx: RendererContext,
): Promise<HTMLElement> {
  const first = (await ctx.ipc.invoke('fetch-artist-recordings', {
    artistId,
    lang,
    offset: 0,
    limit: PAGE_LIMIT,
  })) as RecordingListResponse | null;

  const items = first?.data ?? [];
  let nextOffset = first?.nextOffset ?? null;
  const seed = first?.seed;
  let loading = false;

  if (items.length === 0) return emptyMessage('녹음 없음');

  const section = createListSection(async () => {
    if (loading || nextOffset === null) return;
    loading = true;
    try {
      const more = (await ctx.ipc.invoke('fetch-artist-recordings', {
        artistId,
        lang,
        seed,
        offset: nextOffset,
        limit: PAGE_LIMIT,
      })) as RecordingListResponse | null;
      const moreItems = more?.data ?? [];
      section.appendItems(moreItems);
      nextOffset = more?.nextOffset ?? null;
      if (nextOffset === null) section.setNoMore();
    } finally {
      loading = false;
    }
  });

  section.appendItems(items);
  if (nextOffset === null) section.setNoMore();
  return section.root;
}

function emptyMessage(text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'kanade-empty';
  el.textContent = text;
  return el;
}

async function loadRelatedChips(
  artistId: number,
  ctx: RendererContext,
  lang: string,
  addSubChip: (def: SubChipDef) => void,
): Promise<void> {
  const raw = (await ctx.ipc.invoke('fetch-artist-relations', {
    artistId,
    lang,
  })) as { data: ArtistRelation[] } | null;

  const relations = raw?.data ?? [];
  for (const rel of relations) {
    addSubChip({ artistId: rel.artist.id, name: rel.artist.name });
  }
}
