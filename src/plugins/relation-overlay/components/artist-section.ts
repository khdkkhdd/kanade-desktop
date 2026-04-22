import type { RendererContext } from '../../../types/plugins.js';
import type {
  ArtistCredit,
  ArtistRelation,
  RecordingListResponse,
  VideoRecording,
} from '../types.js';
import { createListSection } from './list-section.js';
import { t } from '../../../i18n/index.js';

const PAGE_LIMIT = 20;

interface SubChipDef {
  artistPublicId: string;
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
 * deduped by artistPublicId, performers first). Returns two elements so the
 * panel can inline the sub-chips next to the "artist" top-chip and keep the
 * card list in the content region.
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

  const chipStates = new Map<string, SubChipState>();
  // Cache per-artist card-list DOM so revisiting a sub-chip restores the
  // exact same cards in the same seeded-random order (instead of re-fetching
  // with a fresh server seed and reshuffling).
  const bodyCache = new Map<string, HTMLElement>();
  let activeArtistPublicId: string | null = null;

  function addSubChip(def: SubChipDef): void {
    if (chipStates.has(def.artistPublicId)) return;
    const btn = createSubChip(def.name, () => void activateChip(def));
    subChips.appendChild(btn);
    chipStates.set(def.artistPublicId, { element: btn, relationsLoaded: false });
  }

  async function activateChip(def: SubChipDef): Promise<void> {
    if (activeArtistPublicId === def.artistPublicId) return;
    if (activeArtistPublicId !== null) {
      const prev = chipStates.get(activeArtistPublicId);
      if (prev) setChipActive(prev.element, false);
    }
    activeArtistPublicId = def.artistPublicId;
    const state = chipStates.get(def.artistPublicId);
    if (!state) return;
    setChipActive(state.element, true);

    content.innerHTML = '';
    let body = bodyCache.get(def.artistPublicId);
    if (!body) {
      body = await renderRecordingsList(def.artistPublicId, lang, ctx);
      bodyCache.set(def.artistPublicId, body);
    }
    content.appendChild(body);

    if (!state.relationsLoaded) {
      state.relationsLoaded = true;
      void loadRelatedChips(def.artistPublicId, ctx, lang, addSubChip);
    }
  }

  const initialChips: SubChipDef[] = credits.map((c) => ({ artistPublicId: c.artistPublicId, name: c.name }));
  for (const def of initialChips) addSubChip(def);
  if (initialChips.length > 0) await activateChip(initialChips[0]);

  return { subChips, content };
}

// For origin recordings, combine recording artists + work creators (performers
// first, then creators), deduped by artistPublicId. For covers, surface only
// the cover's own performers — the work creator (composer/lyricist) belongs
// to the origin, not this cover. Falls back to hidden credits when every
// credit is is_public=false.
function collectVisibleCredits(recording: VideoRecording): ArtistCredit[] {
  const all: ArtistCredit[] = recording.isOrigin
    ? [...recording.artists, ...recording.work.creators]
    : [...recording.artists];
  const byId = new Map<string, ArtistCredit>();
  for (const c of all) {
    const existing = byId.get(c.artistPublicId);
    if (!existing) byId.set(c.artistPublicId, { ...c });
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
  artistPublicId: string,
  lang: string,
  ctx: RendererContext,
): Promise<HTMLElement> {
  const first = (await ctx.ipc.invoke('fetch-artist-recordings', {
    artistPublicId,
    lang,
    offset: 0,
    limit: PAGE_LIMIT,
  })) as RecordingListResponse | null;

  const items = first?.data ?? [];
  let nextOffset = first?.nextOffset ?? null;
  const seed = first?.seed;
  let loading = false;

  if (items.length === 0) return emptyMessage(t('relationOverlay.emptyNoRecordings'));

  const section = createListSection(async () => {
    if (loading || nextOffset === null) return;
    loading = true;
    try {
      const more = (await ctx.ipc.invoke('fetch-artist-recordings', {
        artistPublicId,
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
  artistPublicId: string,
  ctx: RendererContext,
  lang: string,
  addSubChip: (def: SubChipDef) => void,
): Promise<void> {
  const raw = (await ctx.ipc.invoke('fetch-artist-relations', {
    artistPublicId,
    lang,
  })) as { data: ArtistRelation[] } | null;

  const relations = raw?.data ?? [];
  for (const rel of relations) {
    addSubChip({ artistPublicId: rel.artist.publicId, name: rel.artist.name });
  }
}
