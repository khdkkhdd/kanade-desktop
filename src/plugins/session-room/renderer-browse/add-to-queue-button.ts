import type { RendererContext } from '../../../types/plugins.js';
import { showToast } from '../renderer-shared/toast.jsx';
import { fetchOembedMeta } from './youtube-meta.js';
import {
  YT_SELECTORS,
  isThumbnailAnchor,
  isWrapperAnchor,
  findCardHost,
  extractVideoIdFromHref,
  getCurrentVideoId,
  getCurrentVideoDuration,
} from '../../../lib/youtube-dom/index.js';

export function setupAddToQueueButtons(ctx: RendererContext): () => void {
  // Strategy: scan + MutationObserver to inject a button as a SIBLING of every
  // video-card thumbnail anchor (so it lives outside the anchor's potential
  // pointer-events:none scope). Visibility is driven by a `.kanade-hover`
  // class that a mousemove listener toggles based on cursor position — CSS
  // `:hover` propagation can't be trusted across YouTube's varied lockup
  // layouts. Session gating happens via body[data-kanade-session="active"]
  // (set in plugin.tsx).

  const tryInject = (a: HTMLAnchorElement): void => {
    const videoId = extractVideoIdFromHref(a.href);
    if (!videoId) return;
    if (!isThumbnailAnchor(a)) return;
    const parent = a.parentElement;
    if (!parent) return;

    // Always mark the host so hover-anywhere-on-card works, even for wrapper
    // anchors that won't receive the button. In nested-anchor layouts (mix
    // sidebar) the outer wrapper marks the larger card box; the inner
    // thumbnail anchor marks the smaller thumbnail box. CSS hover gate
    // matches buttons inside any .kanade-card-host.kanade-hover ancestor.
    const host = findCardHost(parent);
    host?.classList.add('kanade-card-host');

    // Skip button injection on wrapper anchors that contain another anchor —
    // the inner anchor will inject. Without this skip, the button is
    // duplicated in nested-anchor layouts (e.g., mix sidebar).
    if (isWrapperAnchor(a)) return;
    if (parent.querySelector(':scope > .kanade-add-queue')) return;

    const btn = document.createElement('button');
    btn.className = 'kanade-add-queue';
    const ico = document.createElement('span');
    ico.className = 'kanade-add-queue-ico';
    ico.textContent = '+';
    btn.append(ico, ' 큐');

    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
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

    if (window.getComputedStyle(parent).position === 'static') {
      (parent as HTMLElement).style.position = 'relative';
    }
    parent.appendChild(btn);
  };

  const scan = (root: ParentNode): void => {
    root.querySelectorAll<HTMLAnchorElement>(YT_SELECTORS.videoAnchor).forEach(tryInject);
  };

  scan(document);

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.(YT_SELECTORS.videoAnchor)) tryInject(node as HTMLAnchorElement);
        scan(node);
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // Belt-and-suspenders: some cards (observed in the watch-page related
  // sidebar) escape both the initial scan and MutationObserver — the
  // mechanism isn't clear, possibly a batch render that completes before
  // our observer attaches. Periodic rescan with the cheap parent dedup
  // catches any stragglers without injecting twice.
  const periodicScan = window.setInterval(() => scan(document), 2000);

  // JS hover detection. CSS :hover doesn't reliably propagate to the card
  // wrapper across all YouTube lockup layouts (the homepage rich-grid variant
  // has overlay structure that swallows ancestor :hover from a thumbnail-only
  // hover). elementsFromPoint includes pointer-events:none layers, so we
  // always find the card-host under the cursor regardless of YouTube CSS.
  let raf = 0;
  let hoveredCard: Element | null = null;
  const setHover = (next: Element | null): void => {
    if (next === hoveredCard) return;
    hoveredCard?.classList.remove('kanade-hover');
    hoveredCard = next;
    hoveredCard?.classList.add('kanade-hover');
  };
  const onMove = (e: MouseEvent): void => {
    cancelAnimationFrame(raf);
    const x = e.clientX, y = e.clientY;
    raf = requestAnimationFrame(() => {
      let found: Element | null = null;
      for (const el of document.elementsFromPoint(x, y)) {
        if (!(el instanceof HTMLElement)) continue;
        const card = el.closest('.kanade-card-host');
        if (card) { found = card; break; }
      }
      setHover(found);
    });
  };
  document.addEventListener('mousemove', onMove, { passive: true });

  return () => {
    obs.disconnect();
    window.clearInterval(periodicScan);
    document.removeEventListener('mousemove', onMove);
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
