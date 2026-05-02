export function observeAdState(callback: (isAd: boolean) => void): () => void {
  const player = document.getElementById('movie_player');
  if (!player) {
    callback(false);
    // Wait for player to mount
    const root = document.body;
    const waitObserver = new MutationObserver(() => {
      const p = document.getElementById('movie_player');
      if (p) {
        waitObserver.disconnect();
        attach(p);
      }
    });
    waitObserver.observe(root, { childList: true, subtree: true });
    return () => waitObserver.disconnect();
  }

  return attach(player);

  function attach(p: HTMLElement): () => void {
    const report = () => callback(p.classList.contains('ad-showing'));
    report();
    const obs = new MutationObserver(report);
    obs.observe(p, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }
}
