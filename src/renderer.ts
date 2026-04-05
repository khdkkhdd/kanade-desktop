function extractVideoId(): string | null {
  return new URLSearchParams(window.location.search).get('v');
}

function onNavigate(): void {
  const videoId = extractVideoId();
  console.log('[kanade] navigated:', window.location.href, 'videoId:', videoId);
  window.kanade.ipc.send('navigation:changed', {
    url: window.location.href,
    videoId,
  });
}

// YouTube SPA navigation event
document.addEventListener('yt-navigate-finish', onNavigate);

// Initial navigation on page load
window.addEventListener('load', onNavigate);

// Fallback: URL change via popstate (back/forward)
window.addEventListener('popstate', onNavigate);
