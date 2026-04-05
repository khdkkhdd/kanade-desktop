export function getStyles(): string {
  return `
    .kanade-panel {
      margin-top: 12px;
      font-family: "Roboto", "Arial", sans-serif;
    }

    /* Chip bar — uses YouTube native chip classes */
    .kanade-chip-bar {
      display: flex;
      gap: 8px;
      flex-wrap: nowrap;
      overflow-x: auto;
      margin-bottom: 12px;
      scrollbar-width: none;
    }

    .kanade-chip-bar::-webkit-scrollbar {
      display: none;
    }

    /* Sub chip bar (artist chips) */
    .kanade-sub-chip-bar {
      margin-top: -4px;
      margin-bottom: 12px;
    }

    /* Content area — horizontal scroll */
    .kanade-content {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-behavior: smooth;
      padding-bottom: 4px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.2) transparent;
    }

    .kanade-content::-webkit-scrollbar {
      height: 6px;
    }

    .kanade-content::-webkit-scrollbar-track {
      background: transparent;
    }

    .kanade-content::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.2);
      border-radius: 3px;
    }

    /* Video item — card layout (thumb on top, text below) */
    .kanade-video-item {
      display: flex;
      flex-direction: column;
      width: 210px;
      flex-shrink: 0;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      overflow: hidden;
    }

    .kanade-video-item:hover {
      background: var(--yt-spec-10-percent-layer, rgba(255,255,255,0.05));
    }

    .kanade-video-thumb {
      width: 210px;
      height: 118px;
      border-radius: 8px;
      object-fit: cover;
      background: var(--yt-spec-10-percent-layer, #333);
    }

    .kanade-video-info {
      padding: 8px 4px;
      min-width: 0;
    }

    .kanade-video-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--yt-spec-text-primary, #fff);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .kanade-video-artist {
      font-size: 12px;
      color: var(--yt-spec-text-secondary, #aaa);
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Infinite scroll sentinel */
    .kanade-scroll-sentinel {
      width: 40px;
      flex-shrink: 0;
    }
  `;
}
