// Assumption: YouTube keeps #movie_player as a stable DOM element across SPA
// navigation (yt-navigate-finish), so the class observer attached at first
// mount continues to fire across track changes. If YouTube ever swaps the
// element, the host will silently stop broadcasting isAd:true and guests
// will play through ads.
export function observeAdState(callback: (isAd: boolean) => void): () => void {
  let stopAttached: (() => void) | null = null;

  const attach = (p: HTMLElement): () => void => {
    const report = () => callback(p.classList.contains('ad-showing'));
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
