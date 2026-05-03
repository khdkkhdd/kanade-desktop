export function disableAutoplay(): () => void {
  const apply = () => {
    // YouTube has both an autoplay toggle and JS-driven recommendations.
    // Easiest: toggle the autoplay button if present and currently on.
    const toggle = document.querySelector('[aria-label*="자동재생" i], [aria-label*="autoplay" i]') as HTMLElement | null;
    if (toggle?.getAttribute('aria-checked') === 'true') {
      toggle.click();
    }
  };
  apply();
  const interval = setInterval(apply, 2000);
  return () => clearInterval(interval);
}
