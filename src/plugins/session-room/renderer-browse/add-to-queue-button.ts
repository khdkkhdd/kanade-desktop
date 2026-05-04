import type { RendererContext } from '../../../types/plugins.js';
import { showToast } from '../renderer-shared/toast.jsx';
import { fetchOembedMeta } from './youtube-meta.js';
import {
  YT_SELECTORS,
  isThumbnailAnchor,
  findCardHosts,
  extractVideoIdFromHref,
  getCurrentVideoId,
  getCurrentVideoDuration,
} from '../../../lib/youtube-dom/index.js';

export function setupAddToQueueButtons(ctx: RendererContext): () => void {
  // Strategy: ONE floating button (FAB) appended to <body>. Each card gets a
  // .kanade-card-host marker so we know its bounds; the FAB repositions to
  // overlay whichever card the cursor is currently in.
  //
  // Why body-level vs per-card injection: search ytd-thumbnail
  // [use-hovered-property] activates a hover preview that portals a <video>
  // element above the thumbnail at body level. Per-card buttons are trapped
  // in the thumbnail's local stacking context — even z-index:max-int can't
  // escape, the VIDEO portal renders above. Lifting the button to body level
  // puts it in the same stacking arena as the VIDEO portal so z-index works.
  //
  // Tradeoff: only one card can show the button at a time (single FAB), but
  // that's already the UX (only one card is hovered at a time anyway).
  //
  // Session gating happens via body[data-kanade-session="active"] (set in
  // plugin.tsx).

  let activeVideoId: string | null = null;

  const fab = document.createElement('button');
  fab.className = 'kanade-add-queue';
  const ico = document.createElement('span');
  ico.className = 'kanade-add-queue-ico';
  ico.textContent = '+';
  fab.append(ico, ' 큐');
  document.body.appendChild(fab);

  fab.addEventListener('click', async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const videoId = activeVideoId;
    if (!videoId) return;
    try {
      const meta = await fetchVideoMeta(videoId);
      await ctx.ipc.invoke('queue.add', {
        videoId,
        videoTitle: meta.title,
        channelName: meta.channelName,
        videoDuration: meta.duration,
      });
      showToast('큐에 추가됨', 'info');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const rateLimitMatch = msg.match(/rate-limit:(\d+)/);
      if (rateLimitMatch) {
        const remainingMs = parseInt(rateLimitMatch[1], 10) || 0;
        const seconds = Math.ceil(remainingMs / 1000);
        showToast(`${seconds}초 후 다시 추가할 수 있습니다`, 'warn');
      } else if (msg.includes('permission-denied:')) {
        showToast('Host 만 추가 가능', 'warn');
      } else {
        showToast('큐 추가 실패', 'error');
        console.warn('[session-room] queue.add failed', e);
      }
    }
  });

  const tryMarkHost = (a: HTMLAnchorElement): void => {
    const videoId = extractVideoIdFromHref(a.href);
    if (!videoId) return;
    if (!isThumbnailAnchor(a)) return;
    if (!a.parentElement) return;

    const hosts = findCardHosts(a.parentElement);
    if (hosts.length === 0) return;
    hosts.forEach((h) => { (h as HTMLElement).dataset.kanadeHost = ''; });
  };

  const scan = (root: ParentNode): void => {
    root.querySelectorAll<HTMLAnchorElement>(YT_SELECTORS.videoAnchor).forEach(tryMarkHost);
  };

  scan(document);

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.(YT_SELECTORS.videoAnchor)) tryMarkHost(node as HTMLAnchorElement);
        scan(node);
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // Belt-and-suspenders: some cards (observed in the watch-page related
  // sidebar) escape both the initial scan and MutationObserver. Periodic
  // rescan catches stragglers; idempotent host marking makes this cheap.
  const periodicScan = window.setInterval(() => scan(document), 2000);

  // Hover detection: pure rect-based hit test against marked hosts.
  // Repositions the FAB onto the hovered card's thumbnail box.
  let raf = 0;
  let cursorX = -1, cursorY = -1;
  let hoveredHost: HTMLElement | null = null;
  let unhoverTimer = 0;

  const positionAt = (host: HTMLElement): void => {
    // Find the hovered card's thumbnail anchor — its parent is typically the
    // small thumbnail box (ytd-thumbnail). Use its rect for FAB position so
    // the button sits at the thumbnail's top-left, not the whole card's
    // top-left (matters for horizontal layouts like mix sidebar).
    const a = host.querySelector<HTMLAnchorElement>(YT_SELECTORS.videoAnchor);
    const thumbBox = a?.parentElement;
    const r = (thumbBox || host).getBoundingClientRect();
    fab.style.top = `${r.top + 4}px`;
    fab.style.left = `${r.left + 4}px`;
    activeVideoId = a ? extractVideoIdFromHref(a.href) : null;
  };

  const showFab = (host: HTMLElement): void => {
    positionAt(host);
    fab.classList.add('kanade-visible');
  };
  const hideFab = (): void => {
    fab.classList.remove('kanade-visible');
    activeVideoId = null;
  };

  const setHover = (next: HTMLElement | null): void => {
    if (next === hoveredHost) {
      if (unhoverTimer) { window.clearTimeout(unhoverTimer); unhoverTimer = 0; }
      return;
    }
    if (next === null) {
      if (!unhoverTimer) {
        unhoverTimer = window.setTimeout(() => {
          hoveredHost = null;
          hideFab();
          unhoverTimer = 0;
        }, 150);
      }
      return;
    }
    if (unhoverTimer) { window.clearTimeout(unhoverTimer); unhoverTimer = 0; }
    hoveredHost = next;
    showFab(next);
  };

  const tick = (): void => {
    let found: HTMLElement | null = null;
    if (cursorX >= 0) {
      for (const host of document.querySelectorAll<HTMLElement>('[data-kanade-host]')) {
        const r = host.getBoundingClientRect();
        if (r.width === 0) continue;
        if (cursorX >= r.left && cursorX < r.right &&
            cursorY >= r.top && cursorY < r.bottom) {
          found = host;
          break;
        }
      }
    }
    setHover(found);
    // Re-position FAB on every tick so it tracks if the host moved (e.g.
    // YouTube layout shift during hover preview activation).
    if (hoveredHost && found === hoveredHost) positionAt(hoveredHost);
  };

  const onMove = (e: MouseEvent): void => {
    cursorX = e.clientX;
    cursorY = e.clientY;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  };
  document.addEventListener('mousemove', onMove, { passive: true, capture: true });

  // Reposition on scroll — viewport coords change, fixed-position FAB needs
  // to follow the hovered card.
  const onScroll = (): void => { if (hoveredHost) positionAt(hoveredHost); };
  document.addEventListener('scroll', onScroll, { passive: true, capture: true });

  return () => {
    obs.disconnect();
    window.clearInterval(periodicScan);
    document.removeEventListener('mousemove', onMove, { capture: true });
    document.removeEventListener('scroll', onScroll, { capture: true });
    cancelAnimationFrame(raf);
    if (unhoverTimer) window.clearTimeout(unhoverTimer);
    fab.remove();
  };
}

async function fetchVideoMeta(
  videoId: string,
): Promise<{ title: string; channelName: string; duration: number }> {
  // Title + channel: oEmbed only. The polymer #movie_player.getVideoData()
  // is unreliable across SPA states (PR4 learning #2 — same trap that drove
  // player-sync over to the raw <video> element). oEmbed is a public,
  // CORS-friendly, no-API-key endpoint that gives consistent answers.
  const oembed = await fetchOembedMeta(videoId);

  // Duration: only when we're currently on this exact /watch?v=videoId, read
  // from the HTML5 <video> element. <video>.duration lands as soon as the
  // media metadata loads. If we're hovering a sidebar card for video Y while
  // watching X, there's no local source for Y's duration — leave 0 and let
  // the panel hide the tail.
  const duration = getCurrentVideoId() === videoId ? getCurrentVideoDuration() : 0;

  if (oembed) {
    return { title: oembed.title, channelName: oembed.channelName, duration };
  }
  return { title: videoId, channelName: '', duration };
}
