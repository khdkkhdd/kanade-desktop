import type { RendererContext } from '../../../types/plugins.js';
import { showToast } from '../renderer-shared/toast.jsx';
import { fetchOembedMeta } from './youtube-meta.js';

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
        // Electron IPC wraps main-side throws as
        //   "Error invoking remote method '...': Error: <original>"
        // so .startsWith on the original sentinel never matches. Use .includes
        // and parse rate-limit's remainingMs out of whatever wrapper Electron uses.
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
  // Fast path: if the user is currently watching exactly this video, the
  // on-page polymer player has the freshest metadata + the only source of
  // duration we have without hitting the YouTube Data API.
  const playerEl = document.querySelector('#movie_player') as PlayerElement | null;
  if (playerEl?.getVideoData?.().video_id === videoId) {
    return {
      title: playerEl.getVideoData!().title,
      channelName: playerEl.getVideoData!().author,
      duration: playerEl.getDuration?.() ?? 0,
    };
  }
  // Otherwise (sidebar / grid / search +큐 — typical case where the player
  // is on a different video) fall back to YouTube's oEmbed endpoint for
  // title + channel. Duration stays 0; the panel hides the 0:00 tail.
  const oembed = await fetchOembedMeta(videoId);
  if (oembed) {
    return { title: oembed.title, channelName: oembed.channelName, duration: 0 };
  }
  return { title: videoId, channelName: '', duration: 0 };
}
