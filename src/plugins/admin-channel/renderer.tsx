import { ipcRenderer } from 'electron';
import { render } from 'solid-js/web';
import type { RendererContext } from '../../types/plugins.js';
import { injectAdminStyles } from '../../admin/components/styles.js';
import { ChannelWidget } from './components/ChannelWidget.js';

const MOUNT_ID = 'kanade-admin-channel-widget';

function extractChannelExternalId(): string | null {
  const meta = document.querySelector('meta[itemprop="channelId"]') as HTMLMetaElement | null;
  if (meta?.content) return meta.content;
  const m = window.location.pathname.match(/^\/channel\/(UC[\w-]+)/);
  return m ? m[1] : null;
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
    ob.observe(document.body, { childList: true, subtree: true });
  });
}

export function setupRenderer(ctx: RendererContext): void {
  injectAdminStyles();

  async function onNavigate(): Promise<void> {
    const existing = document.getElementById(MOUNT_ID);
    if (existing) existing.remove();

    if (!isChannelPage()) return;
    const externalId = extractChannelExternalId();
    if (!externalId) return;

    // Gate: hide admin UI entirely unless the API key is valid.
    const authResp = (await ctx.ipc.invoke('check-auth')) as { valid?: boolean } | null;
    if (!authResp?.valid) return;

    const anchor = await waitForElement('ytd-channel-name, #channel-header-container');
    if (!anchor) return;

    const channelName = (document.querySelector('ytd-channel-name #text') as HTMLElement | null)?.textContent?.trim() ?? '';

    const mount = document.createElement('div');
    mount.id = MOUNT_ID;
    mount.style.margin = '12px 0';
    anchor.parentElement?.insertBefore(mount, anchor.nextSibling);

    render(
      () => (
        <ChannelWidget
          ctx={ctx}
          externalId={externalId}
          channelName={channelName}
        />
      ),
      mount,
    );
  }

  document.addEventListener('yt-navigate-finish', () => void onNavigate());
  window.addEventListener('load', () => void onNavigate());

  // Re-check auth and re-mount (or unmount) whenever settings change.
  ipcRenderer.on('settings:changed', () => void onNavigate());
}
