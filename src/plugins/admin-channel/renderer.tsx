import { ipcRenderer } from 'electron';
import { render } from 'solid-js/web';
import type { RendererContext } from '../../types/plugins.js';
import { injectAdminStyles } from '../../admin/components/styles.js';
import { ChannelWidget } from './components/ChannelWidget.js';

const KANADE_TAB_ID = 'kanade-admin-channel-tab';
const KANADE_PANEL_ID = 'kanade-admin-channel-panel';

// Channel identity → UC id cache. Avoids re-extraction (and its DOM-dependent
// failure modes) when navigating between sub-tabs of the same channel.
const channelIdCache = new Map<string, string>();

function getChannelIdentity(): string | null {
  // Strip the sub-tab so /@foo/videos and /@foo/playlists share one cache key.
  const m = window.location.pathname.match(/^(\/channel\/UC[\w-]+|\/@[^/]+|\/c\/[^/]+|\/user\/[^/]+)/);
  return m ? m[1] : null;
}

function extractChannelExternalId(): string | null {
  const identity = getChannelIdentity();

  // 1. Direct URL match: /channel/UC...
  const urlMatch = window.location.pathname.match(/^\/channel\/(UC[\w-]+)/);
  if (urlMatch) {
    if (identity) channelIdCache.set(identity, urlMatch[1]);
    return urlMatch[1];
  }

  // 2. Cache hit — we've already resolved this @handle (or /c/ /user/) before.
  if (identity && channelIdCache.has(identity)) return channelIdCache.get(identity)!;

  // 3. <meta itemprop="channelId">
  const meta = document.querySelector('meta[itemprop="channelId"]') as HTMLMetaElement | null;
  if (meta?.content && /^UC[\w-]{22}$/.test(meta.content)) {
    if (identity) channelIdCache.set(identity, meta.content);
    return meta.content;
  }

  // 4. Fallback: most-frequent /channel/UC... anchor on the page. The current
  //    channel is referenced by many internal nav links (tabs, breadcrumbs),
  //    so it dominates in frequency. Studio links are filtered out.
  const counts = new Map<string, number>();
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    if (!href || href.includes('studio.youtube.com')) return;
    if (!href.startsWith('/channel/') && !href.includes('youtube.com/channel/')) return;
    const match = href.match(/\/channel\/(UC[\w-]{22})/);
    if (!match) return;
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  });
  let winner: string | null = null;
  let max = 1; // require ≥2 occurrences to be confident
  for (const [id, n] of counts) {
    if (n > max) { max = n; winner = id; }
  }

  if (winner && identity) channelIdCache.set(identity, winner);
  return winner;
}

function isChannelPage(): boolean {
  return /^\/(channel\/|@|c\/|user\/)/.test(window.location.pathname);
}

function waitForElement(selector: string, timeout = 10000): Promise<Element | null> {
  const existing = document.querySelector(selector);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const t = setTimeout(() => { ob.disconnect(); resolve(null); }, timeout);
    const ob = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { ob.disconnect(); clearTimeout(t); resolve(el); }
    });
    // Observe attributes too — YouTube often swaps class markers (e.g.
    // ytTabShapeLastTab) on existing elements rather than adding new nodes.
    ob.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  });
}

function findContentArea(): HTMLElement | null {
  return document.querySelector('ytd-two-column-browse-results-renderer') as HTMLElement | null;
}

function pauseVideosIn(container: HTMLElement): void {
  container.querySelectorAll('video').forEach((v) => {
    if (!v.paused) v.pause();
  });
}

function setTabSelected(tab: HTMLElement, selected: boolean): void {
  tab.setAttribute('aria-selected', selected ? 'true' : 'false');
  tab.querySelector('.ytTabShapeTab')?.classList.toggle('ytTabShapeTabSelected', selected);
  tab.querySelector('.ytTabShapeTabBar')?.classList.toggle('ytTabShapeTabBarSelected', selected);
}

function deselectAllNativeTabs(tabList: HTMLElement): void {
  tabList.querySelectorAll('yt-tab-shape[role="tab"]').forEach((tab) => {
    if ((tab as HTMLElement).id === KANADE_TAB_ID) return;
    (tab as HTMLElement).setAttribute('aria-selected', 'false');
    tab.querySelector('.ytTabShapeTab')?.classList.remove('ytTabShapeTabSelected');
    tab.querySelector('.ytTabShapeTabBar')?.classList.remove('ytTabShapeTabBarSelected');
  });
}

function buildKanadeTab(): HTMLElement {
  const tab = document.createElement('yt-tab-shape');
  tab.id = KANADE_TAB_ID;
  tab.setAttribute('role', 'tab');
  tab.setAttribute('tabindex', '0');
  tab.className = 'ytTabShapeHost ytTabShapeHostClickable';
  tab.setAttribute('aria-selected', 'false');
  tab.setAttribute('tab-title', 'Kanade');
  tab.innerHTML = `
    <div class="ytTabShapeTab">Kanade</div>
    <div class="ytTabShapeTabBar"></div>
  `;
  return tab;
}

let disposePanel: (() => void) | null = null;

function showKanadePanel(
  ctx: RendererContext,
  externalId: string,
  channelName: string,
): void {
  const content = findContentArea();
  if (!content) return;

  pauseVideosIn(content);
  content.style.display = 'none';

  disposePanel?.();
  disposePanel = null;
  document.getElementById(KANADE_PANEL_ID)?.remove();

  const panel = document.createElement('div');
  panel.id = KANADE_PANEL_ID;
  panel.className = 'kanade-channel-panel';
  content.parentElement?.insertBefore(panel, content.nextSibling);

  disposePanel = render(
    () => (
      <>
        <h2 class="kanade-channel-panel__title">이 채널의 아티스트</h2>
        <p class="kanade-channel-panel__subtitle">
          연결해 두면 이 채널의 영상 등록 시 해당 아티스트가 자동 추천됩니다.
        </p>
        <ChannelWidget ctx={ctx} externalId={externalId} channelName={channelName} />
      </>
    ),
    panel,
  );
}

function hideKanadePanel(): void {
  const content = findContentArea();
  if (content) content.style.display = '';
  disposePanel?.();
  disposePanel = null;
  document.getElementById(KANADE_PANEL_ID)?.remove();
}

function cleanup(): void {
  hideKanadePanel();
  document.getElementById(KANADE_TAB_ID)?.remove();
}

export function setupRenderer(ctx: RendererContext): void {
  injectAdminStyles();

  let currentExternalId: string | null = null;
  let currentChannelName = '';

  // One-time capture-phase delegate — survives tab bar re-renders.
  document.addEventListener(
    'click',
    (e) => {
      const target = (e.target as HTMLElement | null)?.closest('yt-tab-shape') as HTMLElement | null;
      if (!target) return;
      const kanadeTab = document.getElementById(KANADE_TAB_ID);
      if (!kanadeTab) return;

      if (target.id === KANADE_TAB_ID) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!currentExternalId) return;
        const tabList = kanadeTab.parentElement as HTMLElement | null;
        if (tabList) deselectAllNativeTabs(tabList);
        setTabSelected(kanadeTab, true);
        showKanadePanel(ctx, currentExternalId, currentChannelName);
      } else {
        // A native tab was clicked — YouTube will handle navigation.
        // Just deactivate Kanade tab + restore content. (yt-navigate-finish
        // will re-insert the tab cleanly afterwards.)
        setTabSelected(kanadeTab, false);
        hideKanadePanel();
      }
    },
    { capture: true },
  );

  async function onNavigate(): Promise<void> {
    cleanup();

    if (!isChannelPage()) {
      currentExternalId = null;
      currentChannelName = '';
      return;
    }

    const authResp = (await ctx.ipc.invoke('check-auth')) as { valid?: boolean } | null;
    if (!authResp?.valid) {
      currentExternalId = null;
      currentChannelName = '';
      return;
    }

    // Prefer to anchor before YouTube's search tab — it's the only tab that
    // has .ytTabShapeLastTab WITHOUT .ytTabShapeHostClickable, so it's
    // unambiguously identifiable even during intermediate tab-bar renders
    // (where .ytTabShapeLastTab temporarily moves across content tabs).
    // Shorter timeout: some channel tab bars may not render a search tab,
    // in which case we fall back to appending.
    const searchTab = (await waitForElement(
      '.tabGroupShapeTabs[role="tablist"] > yt-tab-shape.ytTabShapeLastTab:not(.ytTabShapeHostClickable)',
      3000,
    )) as HTMLElement | null;
    const tabList = (searchTab?.parentElement
      ?? document.querySelector('.tabGroupShapeTabs[role="tablist"]')) as HTMLElement | null;
    if (!tabList) return;

    // Extract AFTER DOM is ready — scoped-link fallback needs channel nav to be rendered.
    const externalId = extractChannelExternalId();
    if (!externalId) return;

    const header = document.querySelector('yt-page-header-renderer');
    const nameEl =
      header?.querySelector('h1 .yt-core-attributed-string, h1, #text-container #text') ?? null;
    const channelName = (nameEl as HTMLElement | null)?.textContent?.trim() ?? '';

    currentExternalId = externalId;
    currentChannelName = channelName;

    const kanadeTab = buildKanadeTab();
    if (searchTab && searchTab.parentElement === tabList) {
      tabList.insertBefore(kanadeTab, searchTab);
    } else {
      tabList.appendChild(kanadeTab);
    }
  }

  document.addEventListener('yt-navigate-finish', () => void onNavigate());
  window.addEventListener('load', () => void onNavigate());
  ipcRenderer.on('settings:changed', () => void onNavigate());
}
