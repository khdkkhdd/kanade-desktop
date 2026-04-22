// Admin plugin for YouTube channel pages — adds a "Kanade" tab alongside
// the native tab bar so curators can link artists to the current channel.
//
// Lifecycle (per page visit):
//
//   yt-navigate-finish / load / settings:changed → onNavigate()
//     1. panel.hide() + remove old Kanade tab           (clean prior state)
//     2. mark = panel.mark()                            (capture context for guards)
//     3. if not a channel page: return
//     4. await auth check                               → guard via panel.isValid(mark)
//     5. await YouTube's tab bar render                 → guard again
//     6. probe channel id (existence check only) → insert Kanade tab
//
//   User clicks Kanade tab → handleTabEvent
//     - Re-extracts the channel id and name from the current DOM. Avoids
//       stashing onNavigate's extraction: YouTube's SPA swaps the URL
//       ahead of <meta>/<link rel=canonical>/anchors, so a value captured
//       during that window belongs to the PREVIOUS channel. By click time
//       the DOM has settled, so extraction is reliable.
//     - Both pointerdown and click block YouTube's native tab delegates
//       (preventDefault + stopImmediatePropagation) so YouTube doesn't
//       navigate the URL out from under us.
//     - show() only runs once per click, on the pointerdown phase. Running
//       on both phases previously caused our tab-bar mutations from the
//       first run to re-enter YouTube's MutationObserver and relocate our
//       tab, so the click phase would then hit a native tab and collapse
//       the panel via the hide branch below.
//
//   User clicks a native tab → same handler, hide branch
//     - Unselects the Kanade tab visually, then panel.hide().
//
// Race-guard rule: wherever an async await precedes a DOM mutation, capture
// `panel.mark()` first and re-check `panel.isValid(mark)` right after each
// await. Matches the requestId pattern used in plugins/admin-video/renderer.tsx.

import { ipcRenderer } from 'electron';
import type { RendererContext } from '../../types/plugins.js';
import { injectAdminStyles } from '../../admin/components/styles.js';
import {
  extractChannelName,
  isChannelPage,
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

    // Probe for a resolvable channel id — existence gate only. The actual
    // id used by the panel is re-extracted at click time to sidestep
    // YouTube's stale-DOM-during-navigation window (see handleTabEvent).
    if (!resolveChannelId()) return;

    insertKanadeTab(tabBar.tabList, tabBar.anchorBefore);
  }

  document.addEventListener('yt-navigate-finish', () => void onNavigate());
  window.addEventListener('load', () => void onNavigate());
  ipcRenderer.on('settings:changed', () => void onNavigate());
}
