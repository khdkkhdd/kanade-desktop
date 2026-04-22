// Bridges `window.ytInitialPlayerResponse.videoDetails` into DOM attributes
// that the preload (isolated world) code can read. Modern YouTube watch
// pages only expose the owner as /@handle in the DOM, so without this
// bridge we can't resolve the channel's UC from preload.
//
// The videoId is bridged alongside the channelId so callers can detect
// stale reads (main-world globals can lag during SPA navigation between
// videos); if the URL's ?v= doesn't match the bridged videoId, treat the
// channelId as stale.

export function installVideoChannelBridge(): void {
  if (!document.documentElement) {
    document.addEventListener('DOMContentLoaded', installVideoChannelBridge, { once: true });
    return;
  }
  if (document.documentElement.dataset.kanadeVideoChannelBridgeInstalled === '1') return;
  document.documentElement.dataset.kanadeVideoChannelBridgeInstalled = '1';

  const script = document.createElement('script');
  script.textContent = `
    (function(){
      function sync(){
        var vd = window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails;
        var root = document.documentElement;
        if (vd && vd.channelId && vd.videoId) {
          root.dataset.kanadeVideoChannelId = vd.channelId;
          root.dataset.kanadeVideoId = vd.videoId;
        } else {
          delete root.dataset.kanadeVideoChannelId;
          delete root.dataset.kanadeVideoId;
        }
      }
      sync();
      document.addEventListener('yt-navigate-finish', sync);
      document.addEventListener('yt-page-data-updated', sync);
      document.addEventListener('yt-player-updated', sync);
      setInterval(sync, 300);
    })();
  `;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

/**
 * Reads the bridged channel id, verifying the bridged videoId matches the
 * URL's ?v= param. Returns null when stale or not yet synced.
 */
export function readBridgedChannelId(): string | null {
  const root = document.documentElement;
  const channelId = root.dataset.kanadeVideoChannelId;
  const videoId = root.dataset.kanadeVideoId;
  if (!channelId || !videoId) return null;
  if (!/^UC[\w-]{22}$/.test(channelId)) return null;
  const urlVideoId = new URLSearchParams(window.location.search).get('v');
  if (!urlVideoId || urlVideoId !== videoId) return null;
  return channelId;
}
