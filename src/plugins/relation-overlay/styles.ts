export function getStyles(): string {
  return `
    .kanade-panel {
      margin-top: 12px;
      font-family: "Roboto", "Arial", sans-serif;
      color: var(--yt-spec-text-primary, #fff);
    }

    /* ─── Chip bar (reuses YouTube native chip classes) ─── */
    .kanade-chip-bar {
      display: flex;
      gap: 8px;
      flex-wrap: nowrap;
      align-items: center;
      overflow-x: auto;
      padding-block: 4px;
      margin-bottom: 4px;
      scrollbar-width: none;
    }

    .kanade-chip-bar::-webkit-scrollbar {
      display: none;
    }

    .kanade-sub-chip-bar {
      margin-top: -4px;
      margin-bottom: 4px;
    }

    /* ─── Inline artist sub-chip group (expands after "아티스트" top-chip) ─── */
    .kanade-artist-subchips {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
      overflow: hidden;
      max-width: 0;
      opacity: 0;
      transform: translateX(-8px);
      margin-left: 0;
      transition:
        max-width 0.35s cubic-bezier(.2,.8,.2,1),
        opacity 0.22s ease-out,
        transform 0.28s cubic-bezier(.2,.8,.2,1),
        margin-left 0.28s cubic-bezier(.2,.8,.2,1);
    }

    .kanade-artist-subchips.is-open {
      max-width: 2000px;
      opacity: 1;
      transform: translateX(0);
      margin-left: 8px;
    }

    .kanade-artist-subchip {
      opacity: 0;
      transform: translateX(-6px);
      transition: opacity 0.18s ease-out 0.08s, transform 0.22s cubic-bezier(.2,.8,.2,1) 0.08s;
    }

    .kanade-artist-subchips.is-open .kanade-artist-subchip {
      opacity: 1;
      transform: translateX(0);
    }

    /* ─── Content wrapper ─── */
    .kanade-content {
      display: block;
      min-height: 180px; /* reserve card-area height so tab switches don't collapse the layout */
    }

    /* Tab-enter animation: content slides in from the left and cards stagger */
    @keyframes kanade-content-in {
      from { opacity: 0; transform: translateX(24px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes kanade-card-in {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .kanade-content.kanade-content-enter {
      animation: kanade-content-in 0.28s cubic-bezier(.2,.8,.2,1);
    }

    .kanade-content.kanade-content-enter .kanade-video-item {
      opacity: 0;
      animation: kanade-card-in 0.32s cubic-bezier(.2,.8,.2,1) forwards;
    }

    .kanade-content.kanade-content-enter .kanade-video-item:nth-child(1)  { animation-delay: 0ms; }
    .kanade-content.kanade-content-enter .kanade-video-item:nth-child(2)  { animation-delay: 40ms; }
    .kanade-content.kanade-content-enter .kanade-video-item:nth-child(3)  { animation-delay: 80ms; }
    .kanade-content.kanade-content-enter .kanade-video-item:nth-child(4)  { animation-delay: 120ms; }
    .kanade-content.kanade-content-enter .kanade-video-item:nth-child(5)  { animation-delay: 160ms; }
    .kanade-content.kanade-content-enter .kanade-video-item:nth-child(6)  { animation-delay: 200ms; }
    .kanade-content.kanade-content-enter .kanade-video-item:nth-child(7)  { animation-delay: 240ms; }
    .kanade-content.kanade-content-enter .kanade-video-item:nth-child(n+8) { animation-delay: 280ms; }

    /* Horizontal card list — this is the actual scroll container */
    .kanade-card-list {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-behavior: smooth;
      padding-bottom: 4px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.2) transparent;
    }

    .kanade-card-list::-webkit-scrollbar {
      height: 6px;
    }

    .kanade-card-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .kanade-card-list::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.2);
      border-radius: 3px;
    }

    /* ─── Card (thumb + info) ─── */
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

    .kanade-video-thumb-wrap {
      position: relative;
      width: 210px;
      height: 118px;
    }

    .kanade-video-thumb {
      width: 210px;
      height: 118px;
      border-radius: 8px;
      object-fit: cover;
      background: var(--yt-spec-10-percent-layer, #333);
      display: block;
    }

    .kanade-video-thumb-placeholder {
      background: var(--yt-spec-20-percent-layer, #4a4a4a);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .kanade-card-badge {
      position: absolute;
      top: 6px;
      left: 6px;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1.3;
      letter-spacing: 0.2px;
    }

    .kanade-card-badge-main {
      background: rgba(255, 200, 80, 0.9);
      color: #231800;
    }

    .kanade-card-platform {
      position: absolute;
      bottom: 6px;
      right: 6px;
      font-size: 10px;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
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

    /* ─── Artist section layout ─── */
    .kanade-artist-section {
      display: flex;
      flex-direction: column;
    }

    .kanade-artist-list-holder {
      min-height: 140px;
    }

    .kanade-empty {
      font-size: 13px;
      color: var(--yt-spec-text-secondary, #aaa);
      padding: 12px 4px;
    }
  `;
}
