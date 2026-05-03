export function disableAutoplay(): () => void {
  const apply = () => {
    // YouTube's autonav toggle is `<div class="ytp-autonav-toggle-button"
    // aria-checked="…">`. The aria-label sits on a separate wrapper (verified
    // via smoke), so target the well-known class — same rationale as PR4
    // learning #2: polymer is more reliable to address by class than by ARIA.
    const toggle = document.querySelector('.ytp-autonav-toggle-button') as HTMLElement | null;
    if (toggle?.getAttribute('aria-checked') === 'true') {
      toggle.click();
    }
  };
  apply();
  const interval = setInterval(apply, 2000);
  return () => clearInterval(interval);
}
