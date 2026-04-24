export function getStyles(): string {
  return `
    /* YouTube v2_0 removed the --yt-spec-* design tokens we used to inherit,
       so we define our own palette and switch on the host's html[dark] flag. */
    html {
      --kanade-text-primary: #0f0f0f;
      --kanade-text-secondary: #606060;
      --kanade-base-bg: #fff;
      --kanade-hover-soft: rgba(0,0,0,0.05);
      --kanade-surface-10: rgba(0,0,0,0.1);
      --kanade-mono-hover: #e6e6e6;
      --kanade-scroll-thumb: rgba(0,0,0,0.25);
    }
    html[dark] {
      --kanade-text-primary: #f1f1f1;
      --kanade-text-secondary: rgba(255,255,255,0.7);
      --kanade-base-bg: #0f0f0f;
      --kanade-hover-soft: rgba(255,255,255,0.05);
      --kanade-surface-10: rgba(255,255,255,0.1);
      --kanade-mono-hover: #272727;
      --kanade-scroll-thumb: rgba(255,255,255,0.2);
    }

    .kanade-panel {
      margin-top: 12px;
      font-family: "Roboto", "Arial", sans-serif;
      color: var(--kanade-text-primary);
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

    /* ─── Inline artist sub-chip group (expands after "artist" top-chip) ─── */
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

    /* Wrapper hosting the scroll container + overlay nav buttons. */
    .kanade-card-list-wrap {
      position: relative;
    }

    /* Matches the horizontal-list arrow ytd-button-renderer renders on
       YouTube: a solid circular button carrying the page's base background
       color (so light/dark mode follow the host) with a two-layer soft
       shadow. */
    .kanade-card-nav {
      position: absolute;
      top: calc(50% - 20px);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      padding: 0;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      background-color: var(--kanade-base-bg);
      color: var(--kanade-text-primary);
      box-shadow: 0 4px 4px rgba(0, 0, 0, 0.3), 0 0 4px rgba(0, 0, 0, 0.2);
      transition: opacity 0.15s, background-color 0.15s;
      -webkit-user-select: none;
      user-select: none;
    }

    .kanade-card-nav:hover {
      background-color: var(--kanade-mono-hover);
    }

    .kanade-card-nav:active {
      transform: scale(0.96);
    }

    .kanade-card-nav.is-hidden {
      opacity: 0;
      pointer-events: none;
    }

    .kanade-card-nav--prev { left: 4px; }
    .kanade-card-nav--next { right: 4px; }

    .kanade-card-nav svg {
      pointer-events: none;
      display: block;
    }

    /* Horizontal card list — this is the actual scroll container */
    .kanade-card-list {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-behavior: smooth;
      padding-bottom: 4px;
      scrollbar-width: thin;
      scrollbar-color: var(--kanade-scroll-thumb) transparent;
    }

    .kanade-card-list::-webkit-scrollbar {
      height: 6px;
    }

    .kanade-card-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .kanade-card-list::-webkit-scrollbar-thumb {
      background: var(--kanade-scroll-thumb);
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
      background: var(--kanade-hover-soft);
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
      background: var(--kanade-surface-10);
      display: block;
    }

    .kanade-video-thumb-placeholder {
      background: var(--kanade-surface-10);
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
      color: var(--kanade-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .kanade-video-artist {
      font-size: 12px;
      color: var(--kanade-text-secondary);
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
      color: var(--kanade-text-secondary);
      padding: 12px 4px;
    }
  `;
}
