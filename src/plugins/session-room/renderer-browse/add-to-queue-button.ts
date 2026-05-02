import type { RendererContext } from '../../../types/plugins.js';

const VIDEO_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/))([\w-]{11})/;

export function extractVideoIdFromCard(href: string): string | null {
  const m = href.match(VIDEO_RE);
  return m ? m[1] : null;
}

export function isYouTubeVideoLink(href: string): boolean {
  return extractVideoIdFromCard(href) !== null;
}

export function setupAddToQueueButtons(ctx: RendererContext, sessionActive: () => boolean): () => void {
  // Inject "+큐" button on hover over video card anchors.
  // Use event delegation on document.body — survives YouTube SPA nav.

  const handleHover = (e: Event) => {
    if (!sessionActive()) return;
    const target = e.target as HTMLElement | null;
    const a = target?.closest('a[href]') as HTMLAnchorElement | null;
    if (!a) return;
    const videoId = extractVideoIdFromCard(a.href);
    if (!videoId) return;
    if (a.querySelector('.kanade-add-queue')) return; // already injected

    const btn = document.createElement('button');
    btn.className = 'kanade-add-queue';
    btn.textContent = '+큐';
    btn.style.cssText =
      'position:absolute;top:8px;right:8px;z-index:100;padding:4px 8px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;';

    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      try {
        const meta = await fetchVideoMeta(videoId);
        const r = await ctx.ipc.invoke('queue.add', {
          videoId,
          videoTitle: meta.title,
          channelName: meta.channelName,
          videoDuration: meta.duration,
        });
        console.log('[session-room] queued', r);
      } catch (e) {
        console.warn('[session-room] queue.add failed', e);
      }
    });

    // Inject button — assume parent positions absolutely-friendly
    const host =
      (a.querySelector('ytd-thumbnail, #thumbnail') as HTMLElement | null) ?? a;
    const computed = window.getComputedStyle(host);
    if (computed.position === 'static') host.style.position = 'relative';
    host.appendChild(btn);
  };

  document.body.addEventListener('mouseover', handleHover, true);

  return () => {
    document.body.removeEventListener('mouseover', handleHover, true);
  };
}

interface PlayerElement extends HTMLElement {
  getVideoData?: () => { title: string; author: string; video_id: string };
  getDuration?: () => number;
}

async function fetchVideoMeta(
  videoId: string,
): Promise<{ title: string; channelName: string; duration: number }> {
  // Best-effort: read from current page or use minimal metadata.
  const playerEl = document.querySelector('#movie_player') as PlayerElement | null;
  if (playerEl?.getVideoData?.().video_id === videoId) {
    return {
      title: playerEl.getVideoData!().title,
      channelName: playerEl.getVideoData!().author,
      duration: playerEl.getDuration?.() ?? 0,
    };
  }
  return { title: videoId, channelName: '', duration: 0 };
}
