export function shouldInterceptClick(href: string, currentVideoId?: string): boolean {
  let url: URL;
  try { url = new URL(href); } catch { return false; }
  if (!url.hostname.endsWith('youtube.com')) return false;
  if (currentVideoId && url.pathname === '/watch' && url.searchParams.get('v') === currentVideoId) return false;
  return true;
}

export function setupClickInterceptor(
  routeToBrowse: (url: string) => void,
  getCurrentVideoId: () => string | null,
): () => void {
  const handler = (e: MouseEvent) => {
    const a = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null;
    if (!a) return;
    if (!shouldInterceptClick(a.href, getCurrentVideoId() ?? undefined)) return;
    e.preventDefault();
    e.stopPropagation();
    routeToBrowse(a.href);
  };
  document.addEventListener('click', handler, true);
  return () => document.removeEventListener('click', handler, true);
}
