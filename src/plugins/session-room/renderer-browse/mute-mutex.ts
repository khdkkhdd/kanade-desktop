// src/plugins/session-room/renderer-browse/mute-mutex.ts
export function setupMuteMutex(sessionActive: () => boolean): () => void {
  const apply = () => {
    const videos = document.querySelectorAll('video');
    for (const v of videos) {
      if (sessionActive()) {
        if (!v.muted) v.muted = true;
        if (v.volume !== 0) v.volume = 0;
      }
    }
  };

  apply();
  const obs = new MutationObserver(apply);
  obs.observe(document.body, { subtree: true, childList: true });
  const interval = setInterval(apply, 1000);

  return () => {
    obs.disconnect();
    clearInterval(interval);
  };
}
