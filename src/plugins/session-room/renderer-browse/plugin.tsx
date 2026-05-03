// src/plugins/session-room/renderer-browse/plugin.tsx
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import { CreateDialog, JoinDialog } from './dialogs.jsx';
import { SessionBanner } from './session-banner.jsx';
import { setupAddToQueueButtons } from './add-to-queue-button.js';
import { setupMuteMutex } from './mute-mutex.js';

const STYLE = `
.kanade-banner {
  position: fixed;
  top: 56px;
  left: 0;
  right: 0;
  background: #5a3fff;
  color: #fff;
  padding: 8px 16px;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 16px;
}
`;

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

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  const root = document.createElement('div');
  root.id = 'kanade-session-overlay';
  document.body.appendChild(root);

  const [createOpen, setCreateOpen] = createSignal(false);
  const [sessionActive, setSessionActive] = createSignal(false);
  const [joinOpen, setJoinOpen] = createSignal(false);
  const [hostName, setHostName] = createSignal('');
  const [memberCount, setMemberCount] = createSignal(0);
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

  let bootstrapped = false;
  ctx.ipc.on('state-changed', (state) => {
    bootstrapped = true;
    const s = state as { room: unknown; members?: Array<{ displayName: string; isHost: boolean }> };
    setSessionActive(!!s.room);
    const members = s.members ?? [];
    const host = members.find((m) => m.isHost);
    setHostName(host?.displayName ?? '');
    setMemberCount(members.length);
  });

  void ctx.ipc.invoke('getState').then(
    (state) => {
      if (bootstrapped) return;
      const s = state as { room: unknown; members?: Array<{ displayName: string; isHost: boolean }> };
      setSessionActive(!!s.room);
      const members = s.members ?? [];
      const host = members.find((m) => m.isHost);
      setHostName(host?.displayName ?? '');
      setMemberCount(members.length);
    },
    (e) => console.warn('[session-room] getState failed', e),
  );

  setupAddToQueueButtons(ctx, sessionActive);
  setupMuteMutex(sessionActive); // stop ignored — renderer lifetime

  function getCurrentVideoId(): string | null {
    const m = location.href.match(/[?&]v=([\w-]{11})/);
    return m ? m[1] : null;
  }

  render(() => (
    <>
      <SessionBanner
        active={sessionActive()}
        hostName={hostName()}
        memberCount={memberCount()}
        onShowSession={() => ctx.ipc.send('showSessionWindow')}
        onLeave={() => {
          void ctx.ipc.invoke('leave').catch((e) => console.warn('[session-room] leave failed', e));
        }}
      />
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
