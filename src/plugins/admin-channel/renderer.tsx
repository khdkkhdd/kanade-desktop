// Admin plugin for YouTube channel pages — adds a "Kanade" tab alongside
// the native tab bar so curators can link artists to the current channel.
//
// Channel-id resolution caveat: YouTube does not refresh canonical/og:url
// on SPA navigation between two channels, so the DOM-based resolver only
// works for the channel that was active at initial page load. When the
// user SPA-navs elsewhere and clicks our tab, we force a full reload —
// once the page is fresh the tab re-appears and the click works.

import { ipcRenderer } from 'electron';
import type { RendererContext } from '../../types/plugins.js';
import { injectAdminStyles } from '../../admin/components/styles.js';
import {
  extractChannelName,
  isChannelPage,
  isStaleAfterSpaNav,
  resolveChannelId,
} from './channel-id.js';
import {
  KANADE_TAB_ID,
  deselectAllNativeTabs,
  insertKanadeTab,
  locateTabBar,
  setTabSelected,
} from './tab-dom.js';
import { createPanelController } from './panel-controller.js';

export function setupRenderer(ctx: RendererContext): void {
  injectAdminStyles();
  const panel = createPanelController(ctx);

  function removeKanadeTab(): void {
    document.getElementById(KANADE_TAB_ID)?.remove();
  }

  function handleTabEvent(e: Event): void {
    const target = (e.target as HTMLElement | null)?.closest('yt-tab-shape') as HTMLElement | null;
    if (!target) return;
    const kanadeTab = document.getElementById(KANADE_TAB_ID);
    if (!kanadeTab) return;

    if (target.id === KANADE_TAB_ID) {
      // Block YouTube on both phases, but run the show effect only once.
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type !== 'pointerdown') return;

      if (isStaleAfterSpaNav()) {
        // DOM is still the previous channel's — only a full reload will
        // fix canonical/og:url. After reload the tab reappears and the
        // next click resolves normally.
        location.reload();
        return;
      }

      const externalId = resolveChannelId();
      if (!externalId) return;

      const tabList = kanadeTab.parentElement as HTMLElement | null;
      if (tabList) deselectAllNativeTabs(tabList);
      setTabSelected(kanadeTab, true);
      void panel.show(externalId, extractChannelName());
    } else if (e.type === 'click') {
      setTabSelected(kanadeTab, false);
      panel.hide();
    }
  }
  document.addEventListener('pointerdown', handleTabEvent, { capture: true });
  document.addEventListener('click', handleTabEvent, { capture: true });

  async function onNavigate(): Promise<void> {
    panel.hide();
    removeKanadeTab();
    const mark = panel.mark();
    if (!isChannelPage()) return;

    const authResp = (await ctx.ipc.invoke('check-auth')) as { valid?: boolean } | null;
    if (!panel.isValid(mark)) return;
    if (!authResp?.valid) return;

    const tabBar = await locateTabBar(3000);
    if (!panel.isValid(mark)) return;
    if (!tabBar) return;

    insertKanadeTab(tabBar.tabList, tabBar.anchorBefore);
  }

  document.addEventListener('yt-navigate-finish', () => void onNavigate());
  window.addEventListener('load', () => void onNavigate());
  ipcRenderer.on('settings:changed', () => void onNavigate());
}
