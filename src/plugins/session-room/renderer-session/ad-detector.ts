// Assumption: YouTube keeps #movie_player as a stable DOM element across SPA
// navigation (yt-navigate-finish), so the class observer attached at first
// mount continues to fire across track changes. If YouTube ever swaps the
// element, the host will silently stop broadcasting isAd:true and guests
// will play through ads.
export function observeAdState(callback: (isAd: boolean) => void): () => void {
  let stopAttached: (() => void) | null = null;

  const attach = (p: HTMLElement): () => void => {
    // YouTube mutates #movie_player's class very frequently (playback mode,
    // hover state, etc.). Only invoke the callback when the ad-showing bit
    // actually flips, so consumers (host-sync's broadcast) don't fire on
    // every unrelated class change.
    let lastValue: boolean | null = null;
    const report = () => {
      const v = p.classList.contains('ad-showing');
      if (v === lastValue) return;
      lastValue = v;
      callback(v);
    };
    report();
    const obs = new MutationObserver(report);
    obs.observe(p, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  };

  const player = document.getElementById('movie_player');
  if (player) {
    stopAttached = attach(player);
    return () => stopAttached?.();
  }

  callback(false);
  const waitObserver = new MutationObserver(() => {
    const p = document.getElementById('movie_player');
    if (p) {
      waitObserver.disconnect();
      stopAttached = attach(p);
    }
  });
  waitObserver.observe(document.body, { childList: true, subtree: true });
  return () => {
    waitObserver.disconnect();
    stopAttached?.();
  };
}
