// src/plugins/session-room/renderer-browse/plugin.tsx
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import { CreateDialog, JoinDialog } from './dialogs.jsx';

export async function setupBrowseRenderer(ctx: RendererContext): Promise<void> {
  if ((window as unknown as { kanadeMode?: string }).kanadeMode === 'session') {
    return; // skip in session window
  }

  // preload runs before document.body exists. Wait until DOM is ready before
  // mounting the overlay root.
  if (!document.body) {
    await new Promise<void>((resolve) => {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
    });
  }

  const root = document.createElement('div');
  root.id = 'kanade-session-overlay';
  document.body.appendChild(root);

  const [createOpen, setCreateOpen] = createSignal(false);
  const [joinOpen, setJoinOpen] = createSignal(false);
  const [defaultName, setDefaultName] = createSignal('');
  const [clipboardCode, setClipboardCode] = createSignal('');

  const tryReadClipboard = async (): Promise<void> => {
    try {
      const txt = (await navigator.clipboard.readText()).trim();
      if (/^[0-9a-z]{6}$/.test(txt)) setClipboardCode(txt);
      else setClipboardCode('');
    } catch (e) {
      // clipboard read denied or unavailable — keep clipboardCode empty
      console.warn('[session-room] clipboard read failed', e);
      setClipboardCode('');
    }
  };

  const refreshDisplayName = async (): Promise<void> => {
    try {
      const name = (await ctx.ipc.invoke('getDisplayName')) as string;
      setDefaultName(name ?? '');
    } catch (e) {
      console.warn('[session-room] getDisplayName failed', e);
      setDefaultName('');
    }
  };

  ctx.ipc.on('open-create-dialog', () => {
    void refreshDisplayName().then(() => setCreateOpen(true));
  });

  ctx.ipc.on('open-join-dialog', () => {
    void Promise.all([refreshDisplayName(), tryReadClipboard()]).then(() => setJoinOpen(true));
  });

  function getCurrentVideoId(): string | null {
    const m = location.href.match(/[?&]v=([\w-]{11})/);
    return m ? m[1] : null;
  }

  render(() => (
    <>
      <CreateDialog
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
        defaultDisplayName={defaultName()}
        onSubmit={async (a) => {
          await ctx.ipc.invoke('create', {
            displayName: a.displayName,
            initialVideoId: getCurrentVideoId(),
          });
        }}
      />
      <JoinDialog
        open={joinOpen()}
        onClose={() => setJoinOpen(false)}
        defaultDisplayName={defaultName()}
        defaultCode={clipboardCode()}
        onSubmit={async (a) => {
          await ctx.ipc.invoke('join', {
            displayName: a.displayName,
            roomCode: a.roomCode,
          });
        }}
      />
    </>
  ), root);

  console.log('[session-room] browse renderer started');
}
