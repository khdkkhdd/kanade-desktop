export function waitForElement(
  selector: string,
  timeout = 10000,
): Promise<Element | null> {
  const existing = document.querySelector(selector);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      ob.disconnect();
      resolve(null);
    }, timeout);
    const ob = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        ob.disconnect();
        clearTimeout(timer);
        resolve(el);
      }
    });
    // Observe attributes too — YouTube often swaps class markers (e.g.
    // ytTabShapeLastTab) on existing elements rather than adding new nodes,
    // so a pure childList/subtree observer would miss those transitions.
    ob.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  });
}
