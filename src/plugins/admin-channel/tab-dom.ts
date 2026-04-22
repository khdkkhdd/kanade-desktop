// YouTube tab-bar DOM operations — isolated here so the few places that
// reach into YouTube's internal class names (`ytTabShapeTab`, etc.) stay
// confined to one file. When YouTube ships a tab-bar redesign, edits are
// localized to this module.

import { waitForElement } from './dom-utils.js';

export const KANADE_TAB_ID = 'kanade-admin-channel-tab';

// The search tab is the only tab with .ytTabShapeLastTab WITHOUT
// .ytTabShapeHostClickable — unambiguous even during intermediate tab-bar
// renders, where .ytTabShapeLastTab temporarily moves across content tabs.
const SEARCH_TAB_SELECTOR =
  '.tabGroupShapeTabs[role="tablist"] > yt-tab-shape.ytTabShapeLastTab:not(.ytTabShapeHostClickable)';
const TAB_LIST_SELECTOR = '.tabGroupShapeTabs[role="tablist"]';

export function buildKanadeTab(): HTMLElement {
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

export function setTabSelected(tab: HTMLElement, selected: boolean): void {
  // YouTube styles both aria-selected and per-element class markers, so
  // both must flip for the tab to visually switch.
  tab.setAttribute('aria-selected', selected ? 'true' : 'false');
  tab.querySelector('.ytTabShapeTab')?.classList.toggle('ytTabShapeTabSelected', selected);
  tab.querySelector('.ytTabShapeTabBar')?.classList.toggle('ytTabShapeTabBarSelected', selected);
}

export function deselectAllNativeTabs(tabList: HTMLElement): void {
  tabList.querySelectorAll('yt-tab-shape[role="tab"]').forEach((tab) => {
    if ((tab as HTMLElement).id === KANADE_TAB_ID) return;
    setTabSelected(tab as HTMLElement, false);
  });
}

/** Waits for the channel page's tab bar to render, returning the insertion
 *  point. `anchorBefore === null` means "append to the end" (some channel
 *  tab bars don't render a search tab). Returns null if the tab list never
 *  appears within the timeout. */
export async function locateTabBar(
  timeout = 3000,
): Promise<{ tabList: HTMLElement; anchorBefore: HTMLElement | null } | null> {
  const searchTab = (await waitForElement(
    SEARCH_TAB_SELECTOR,
    timeout,
  )) as HTMLElement | null;
  const tabList = (searchTab?.parentElement ??
    document.querySelector(TAB_LIST_SELECTOR)) as HTMLElement | null;
  if (!tabList) return null;
  return {
    tabList,
    anchorBefore: searchTab?.parentElement === tabList ? searchTab : null,
  };
}

export function insertKanadeTab(
  tabList: HTMLElement,
  anchorBefore: HTMLElement | null,
): HTMLElement {
  const tab = buildKanadeTab();
  if (anchorBefore) {
    tabList.insertBefore(tab, anchorBefore);
  } else {
    tabList.appendChild(tab);
  }
  return tab;
}
