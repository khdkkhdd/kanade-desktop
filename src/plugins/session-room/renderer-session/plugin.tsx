import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import { SessionPanel, type PanelState } from './session-panel/SessionPanel.jsx';

const STYLE = `
.kanade-session-panel {
  position: fixed;
  top: 56px;
  right: 0;
  bottom: 0;
  width: 340px;
  background: #181818;
  color: #fff;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  font-family: 'Roboto', sans-serif;
  font-size: 13px;
  transition: transform 0.2s ease;
}
.kanade-session-panel.closed { transform: translateX(310px); }
.kanade-toggle {
  position: absolute;
  left: -30px;
  top: 50%;
  width: 30px;
  height: 60px;
  background: #181818;
  color: #fff;
  border: none;
  border-radius: 6px 0 0 6px;
  cursor: pointer;
}
.kanade-tabs { display: flex; gap: 4px; padding: 8px; border-bottom: 1px solid #333; }
.kanade-tabs button { flex: 1; background: transparent; color: #aaa; border: none; padding: 8px; cursor: pointer; }
.kanade-tabs button.active { color: #fff; border-bottom: 2px solid #f00; }
.kanade-room-code { padding: 8px; border-bottom: 1px solid #333; font-size: 12px; }
.kanade-room-code code { background: #000; padding: 2px 6px; margin: 0 6px; }
.kanade-current { padding: 8px; border-bottom: 1px solid #333; }
.kanade-current .label { color: #f00; font-size: 11px; }
.kanade-list { flex: 1; overflow-y: auto; }
.kanade-item { padding: 8px; border-bottom: 1px solid #2a2a2a; display: flex; flex-direction: column; gap: 2px; }
.kanade-item .meta { color: #888; font-size: 11px; }
.kanade-host-controls { padding: 8px; display: flex; gap: 8px; border-top: 1px solid #333; }
.kanade-presence { padding: 8px; border-top: 1px solid #333; display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; }
.kanade-presence .host { color: gold; }
`;

export async function setupSessionRenderer(ctx: RendererContext): Promise<void> {
  if ((window as unknown as { kanadeMode?: string }).kanadeMode !== 'session') return;

  // preload runs before document.body / head exists. Wait for DOM ready.
  if (!document.body) {
    await new Promise<void>((resolve) => {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
    });
  }

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  const root = document.createElement('div');
  document.body.appendChild(root);

  let bootstrapped = false;
  const [state, setState] = createSignal<PanelState>(toPanelState({}));

  ctx.ipc.on('state-changed', (s) => {
    bootstrapped = true;
    setState(toPanelState(s as Record<string, unknown>));
  });

  void ctx.ipc.invoke('getState').then(
    (s) => {
      if (bootstrapped) return;
      setState(toPanelState(s as Record<string, unknown>));
    },
    (e) => console.warn('[session-room] getState failed', e),
  );

  render(() => <SessionPanel ctx={ctx} state={state} />, root);

  console.log('[session-room] session renderer started');
}

function toPanelState(raw: Record<string, unknown>): PanelState {
  return {
    queue: (raw.queue as PanelState['queue']) ?? [],
    currentItemId: (raw.currentItemId as PanelState['currentItemId']) ?? null,
    members: (raw.members as PanelState['members']) ?? [],
    isHost: !!raw.isHost,
    myMemberKey: (raw.myMemberKey as string) ?? '',
    permission: (raw.permission as PanelState['permission']) ?? 'playlist',
    roomCode: ((raw.room as { code?: string } | null)?.code) ?? '',
  };
}
