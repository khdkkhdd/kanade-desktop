import { ipcRenderer } from 'electron';
import { render } from 'solid-js/web';
import type { RendererContext } from '../../types/plugins.js';
import { injectAdminStyles } from '../../admin/components/styles.js';
import { VideoDrawer, type DraftData } from './components/VideoDrawer.js';

// In-memory drafts keyed by videoId. Survives drawer open/close within the
// session so users don't lose in-progress form data; cleared on commit.
const drafts = new Map<string, DraftData>();

const BUTTON_ID = 'kanade-admin-video-btn';
const DRAWER_ID = 'kanade-admin-video-drawer';

function extractVideoId(): string | null {
  const p = new URLSearchParams(window.location.search).get('v');
  if (p) return p;
  const m = window.location.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
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
  let currentVideoId: string | null = null;
  let requestId = 0;

  async function onNavigate(): Promise<void> {
    const videoId = extractVideoId();
    removeUI();
    currentVideoId = videoId;
    if (!videoId) return;
    const myRequest = ++requestId;

    // Gate: hide admin UI entirely unless the API key is valid.
    const authResp = (await ctx.ipc.invoke('check-auth')) as { valid?: boolean } | null;
    if (myRequest !== requestId) return;
    if (!authResp?.valid) return;

    const stateResp = (await ctx.ipc.invoke('get-video-state', { videoId })) as
      | { ok: true; data: { registered: boolean; video?: unknown } }
      | { ok: false; error: { code: string; message: string } };
    if (myRequest !== requestId) return;

    const registered = stateResp.ok ? stateResp.data.registered : false;
    const initialData = stateResp.ok ? (stateResp.data as any).video : null;

    await waitForElement('ytd-watch-metadata');
    if (myRequest !== requestId) return;

    mountButton(videoId, registered, initialData);
  }

  function mountButton(videoId: string, registered: boolean, initialData: any): void {
    removeUI();
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.className = `kanade-admin-fab ${registered ? 'kanade-admin-fab--edit' : ''}`;
    btn.textContent = registered ? '✎' : '+';
    btn.title = registered ? '이 영상 편집' : '이 영상 등록';
    btn.onclick = () => openDrawer(videoId, registered ? 'edit' : 'create', initialData);
    document.body.appendChild(btn);
  }

  function openDrawer(videoId: string, mode: 'create' | 'edit', initialData: any): void {
    let container = document.getElementById(DRAWER_ID);
    if (container) container.remove();
    container = document.createElement('div');
    container.id = DRAWER_ID;
    document.body.appendChild(container);
    const dispose = render(
      () => (
        <VideoDrawer
          videoId={videoId}
          mode={mode}
          initialData={initialData}
          ctx={ctx}
          initialDraft={drafts.get(videoId) ?? null}
          onDraftChange={(d) => drafts.set(videoId, d)}
          onDraftDiscard={() => drafts.delete(videoId)}
          onClose={() => { dispose(); container?.remove(); }}
          onCommitted={() => {
            drafts.delete(videoId);
            dispose(); container?.remove();
            void onNavigate();
          }}
        />
      ),
      container!,
    );
  }

  function removeUI(): void {
    document.getElementById(BUTTON_ID)?.remove();
    document.getElementById(DRAWER_ID)?.remove();
  }

  document.addEventListener('yt-navigate-finish', () => {
    currentVideoId = null;
    void onNavigate();
  });
  window.addEventListener('load', () => void onNavigate());

  // Re-check auth and re-mount (or unmount) whenever settings change.
  ipcRenderer.on('settings:changed', () => void onNavigate());
}
