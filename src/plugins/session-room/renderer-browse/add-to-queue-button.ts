import type { RendererContext } from '../../../types/plugins.js';
import { showToast } from '../renderer-shared/toast.jsx';
import { fetchOembedMeta } from './youtube-meta.js';
import { t } from '../../../i18n/index.js';
import {
  YT_SELECTORS,
  isThumbnailAnchor,
  findCardHosts,
  extractVideoIdFromHref,
  getCurrentVideoId,
  getCurrentVideoDuration,
} from '../../../lib/youtube-dom/index.js';

export function setupAddToQueueButtons(ctx: RendererContext): () => void {
  // One floating button at body level. Each marked card gets data-kanade-host
  // so we know its bounds; the button repositions onto whichever card the
  // cursor is in. Body level is required because YouTube's hover preview
  // (search ytd-thumbnail[use-hovered-property]) portals a <video> above the
  // card at body level — a per-card button trapped in the thumbnail's local
  // stacking context loses to that portal regardless of z-index.

  let activeVideoId: string | null = null;

  const fab = document.createElement('button');
  fab.className = 'kanade-add-queue';
  const ico = document.createElement('span');
  ico.className = 'kanade-add-queue-ico';
  ico.textContent = '+';
  // Label is set once at mount; reads current locale at the moment the
  // injection runs. Locale switches mid-session don't restyle the FAB until
  // the next page navigation re-mounts the overlay, matching the rest of the
  // vanilla-DOM overlay plugins (relation-overlay panel, etc.).
  fab.append(ico, ` ${t('session.fabLabel')}`);
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
      showToast(t('session.toastAddSuccess'), 'info');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const rateLimitMatch = msg.match(/rate-limit:(\d+)/);
      if (rateLimitMatch) {
        const remainingMs = parseInt(rateLimitMatch[1], 10) || 0;
        const seconds = Math.ceil(remainingMs / 1000);
        showToast(t('session.toastAddCooldown', { sec: String(seconds) }), 'warn');
      } else if (msg.includes('permission-denied:')) {
        showToast(t('session.toastAddPermissionDenied'), 'warn');
      } else {
        showToast(t('session.toastAddFailed'), 'error');
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

  // Rect-based hover detection. The button targets the thumbnail anchor's
  // parent (typically ytd-thumbnail) so it sits at the thumbnail's top-left
  // even in horizontal layouts (mix sidebar) where the host is the whole row.
  let raf = 0;
  let cursorX = -1, cursorY = -1;
  let hoveredHost: HTMLElement | null = null;

  const positionAt = (host: HTMLElement): void => {
    const a = host.querySelector<HTMLAnchorElement>(YT_SELECTORS.videoAnchor);
    const r = (a?.parentElement || host).getBoundingClientRect();
    fab.style.top = `${r.top + 4}px`;
    fab.style.left = `${r.left + 4}px`;
    activeVideoId = a ? extractVideoIdFromHref(a.href) : null;
  };

  const setHover = (next: HTMLElement | null): void => {
    if (next === hoveredHost) return;
    hoveredHost = next;
    if (next) {
      positionAt(next);
      fab.classList.add('kanade-visible');
    } else {
      fab.classList.remove('kanade-visible');
      activeVideoId = null;
    }
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
    // Same-host re-position keeps the FAB aligned if YouTube animates the
    // thumbnail (e.g., scale on hover-preview activation).
    if (hoveredHost && found === hoveredHost) positionAt(hoveredHost);
  };

  const onMove = (e: MouseEvent): void => {
    cursorX = e.clientX;
    cursorY = e.clientY;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  };
  document.addEventListener('mousemove', onMove, { passive: true });

  // FAB is position:fixed in viewport coords; reposition on scroll so it
  // tracks the hovered card. capture catches inner-scroller scrolls too.
  const onScroll = (): void => { if (hoveredHost) positionAt(hoveredHost); };
  document.addEventListener('scroll', onScroll, { passive: true, capture: true });

  return () => {
    obs.disconnect();
    window.clearInterval(periodicScan);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('scroll', onScroll, { capture: true });
    cancelAnimationFrame(raf);
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
