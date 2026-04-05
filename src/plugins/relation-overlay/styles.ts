export function getStyles(): string {
  return `
    .kanade-panel {
      margin-top: 12px;
      padding: 16px;
      border-radius: 12px;
      background: var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1));
      font-family: "Roboto", "Arial", sans-serif;
      container-name: kanade-panel;
      container-type: inline-size;
    }

    .kanade-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .kanade-header-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--yt-spec-text-primary, #fff);
    }

    .kanade-header-line {
      height: 1px;
      flex: 1;
      background: var(--yt-spec-10-percent-layer, rgba(255,255,255,0.1));
    }

    .kanade-section {
      margin-bottom: 16px;
    }

    .kanade-section:last-child {
      margin-bottom: 0;
    }

    .kanade-section-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--yt-spec-text-primary, #fff);
      margin-bottom: 8px;
    }

    .kanade-section-divider {
      border-top: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,0.1));
      padding-top: 12px;
    }

    .kanade-original-badge {
      padding: 8px 12px;
      background: var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1));
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .kanade-original-label {
      font-size: 12px;
      color: var(--yt-spec-text-secondary, #aaa);
      margin-bottom: 6px;
    }

    .kanade-video-item {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 5px 6px;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
    }

    .kanade-video-item:hover {
      background: var(--yt-spec-10-percent-layer, rgba(255,255,255,0.05));
    }

    .kanade-video-thumb {
      width: 120px;
      height: 68px;
      border-radius: 6px;
      flex-shrink: 0;
      object-fit: cover;
      background: var(--yt-spec-10-percent-layer, #333);
    }

    .kanade-video-info {
      flex: 1;
      min-width: 0;
    }

    .kanade-video-title {
      font-size: 14px;
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

    @container kanade-panel (max-width: 500px) {
      .kanade-video-item {
        flex-direction: column;
        align-items: stretch;
        gap: 0;
      }

      .kanade-video-thumb {
        width: 100%;
        height: auto;
        aspect-ratio: 16 / 9;
      }

      .kanade-video-info {
        padding: 8px 4px;
      }
    }

    .kanade-chip-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .kanade-chip {
      padding: 7px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-family: "Roboto", "Arial", sans-serif;
      cursor: pointer;
      border: none;
      background: var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1));
      color: var(--yt-spec-text-primary, #fff);
      transition: background 0.15s;
    }

    .kanade-chip:hover {
      background: var(--yt-spec-10-percent-layer, rgba(255,255,255,0.15));
    }

    .kanade-chip.active {
      background: var(--yt-spec-text-primary, #fff);
      color: var(--yt-spec-static-overlay-background-inverse, #0f0f0f);
      font-weight: 500;
    }

    .kanade-load-more {
      display: block;
      width: 100%;
      padding: 8px;
      margin-top: 8px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--yt-spec-text-secondary, #aaa);
      font-size: 13px;
      font-family: "Roboto", "Arial", sans-serif;
      cursor: pointer;
      text-align: center;
    }

    .kanade-load-more:hover {
      background: var(--yt-spec-10-percent-layer, rgba(255,255,255,0.05));
    }
  `;
}
