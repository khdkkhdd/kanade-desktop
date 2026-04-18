import type { RendererContext } from '../../../types/plugins.js';
import type { VideoResponse } from '../types.js';
import { getStyles } from '../styles.js';
import { createOriginalSection } from './original-section.js';
import { createCoversSection } from './covers-section.js';
import { createSameRecordingVideosSection } from './same-recording-videos-section.js';
import { createArtistSection } from './artist-section.js';

const PANEL_ID = 'kanade-relation-panel';
const STYLE_ID = 'kanade-relation-styles';

interface TopChipDef {
  id: string;
  label: string;
  content: HTMLElement;
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = getStyles();
  document.head.appendChild(style);
}

/**
 * Builds the overlay: single chip bar (원곡 / 같은녹음 / 커버 / 아티스트 + 아티스트
 * 서브칩이 그 옆에 인라인으로 확장됨) + content area for the active chip.
 */
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

  const recording = data.recordings[0];
  if (!recording) return panel;

  const topChipBar = document.createElement('div');
  topChipBar.className = 'kanade-chip-bar';
  panel.appendChild(topChipBar);

  const content = document.createElement('div');
  content.className = 'kanade-content';
  panel.appendChild(content);

  const topChips: TopChipDef[] = [];
  const topChipElements = new Map<string, HTMLButtonElement>();
  let activeTopChipId: string | null = null;

  const workId = recording.work.id;
  const [originalContent, sameRecContent, coversContent, artistParts] = await Promise.all([
    createOriginalSection(workId, recording.id, lang, ctx),
    createSameRecordingVideosSection(recording, videoId, lang, ctx),
    createCoversSection(workId, recording.id, lang, ctx),
    createArtistSection(recording, lang, ctx),
  ]);

  if (originalContent) topChips.push({ id: 'original', label: '원곡', content: originalContent });
  if (sameRecContent) topChips.push({ id: 'same-recording', label: '같은 녹음의 다른 영상', content: sameRecContent });
  if (coversContent) topChips.push({ id: 'covers', label: '커버', content: coversContent });
  if (artistParts) topChips.push({ id: 'artists', label: '아티스트', content: artistParts.content });

  if (topChips.length === 0) return panel;

  function selectTopChip(id: string): void {
    if (activeTopChipId === id) return;
    if (activeTopChipId !== null) {
      const prev = topChipElements.get(activeTopChipId);
      if (prev) setChipActive(prev, false);
    }
    activeTopChipId = id;
    const curr = topChipElements.get(id);
    if (curr) setChipActive(curr, true);

    // Toggle artist sub-chip inline panel
    if (artistParts) {
      artistParts.subChips.classList.toggle('is-open', id === 'artists');
    }

    content.innerHTML = '';
    const chip = topChips.find((c) => c.id === id);
    if (chip) {
      content.appendChild(chip.content);
      // Reset scroll of every card list inside the newly active section so
      // each tab starts from the beginning.
      chip.content.querySelectorAll<HTMLElement>('.kanade-card-list').forEach((list) => {
        list.scrollLeft = 0;
      });
      // Re-trigger the enter animation on the content wrapper.
      content.classList.remove('kanade-content-enter');
      void content.offsetWidth; // force reflow so the animation re-plays
      content.classList.add('kanade-content-enter');
    }
  }

  for (const def of topChips) {
    const btn = createTopChip(def.label, () => selectTopChip(def.id));
    topChipBar.appendChild(btn);
    topChipElements.set(def.id, btn);
    // Inline the artist sub-chip group right after the "아티스트" top-chip.
    if (def.id === 'artists' && artistParts) {
      topChipBar.appendChild(artistParts.subChips);
    }
  }

  selectTopChip(topChips[0].id);
  return panel;
}

function createTopChip(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'ytChipShapeButtonReset';
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', 'false');

  const chipDiv = document.createElement('div');
  chipDiv.className = 'ytChipShapeChip ytChipShapeInactive ytChipShapeOnlyTextPadding';
  const text = document.createElement('div');
  text.textContent = label;
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

export function removePanel(): void {
  document.getElementById(PANEL_ID)?.remove();
}
