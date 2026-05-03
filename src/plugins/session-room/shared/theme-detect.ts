import type { Theme } from './design-tokens.js';

export function detectYouTubeTheme(): Theme {
  return document.documentElement.hasAttribute('dark') ? 'dark' : 'light';
}

export function subscribeYouTubeTheme(callback: (theme: Theme) => void): () => void {
  const observer = new MutationObserver(() => {
    callback(detectYouTubeTheme());
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['dark'],
  });
  return () => observer.disconnect();
}
