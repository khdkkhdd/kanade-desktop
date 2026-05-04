// src/plugins/session-room/renderer-session/session-panel/use-panel-mode.ts
import { createSignal } from 'solid-js';

export type PanelMode = 'closed' | 'peek' | 'pinned';

export interface PanelModeOptions {
  initial?: PanelMode;
  leaveDelayMs?: number;
}

export interface PanelModeApi {
  mode: () => PanelMode;
  /** Toggle button (`.kanade-toggle`) hover boolean. */
  setToggleHovered: (v: boolean) => void;
  /** Panel container (`.kanade-session-panel`) hover boolean. */
  setPanelHovered: (v: boolean) => void;
  /** Whether keyboard focus is inside the panel container. */
  setFocusInside: (v: boolean) => void;
  /** Click on toggle button OR Cmd/Ctrl+Shift+P shortcut. */
  togglePin: () => void;
  /** Window blur (alt-tab away). */
  windowBlur: () => void;
  /** Test/cleanup helper — clears pending leave timer. */
  dispose: () => void;
}

export function usePanelMode(opts: PanelModeOptions = {}): PanelModeApi {
  const leaveDelayMs = opts.leaveDelayMs ?? 200;
  const [mode, setMode] = createSignal<PanelMode>(opts.initial ?? 'pinned');

  let toggleHovered = false;
  let panelHovered = false;
  let focusInside = false;
  let leaveTimer: ReturnType<typeof setTimeout> | null = null;

  const isHovered = (): boolean => toggleHovered || panelHovered;

  const cancelLeave = (): void => {
    if (leaveTimer !== null) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }
  };

  const scheduleLeave = (): void => {
    cancelLeave();
    leaveTimer = setTimeout(() => {
      leaveTimer = null;
      // Re-check at firing time — state may have changed during the delay.
      if (mode() === 'peek' && !isHovered() && !focusInside) {
        setMode('closed');
      }
    }, leaveDelayMs);
  };

  const reevaluate = (): void => {
    const m = mode();
    if (m === 'closed' && isHovered()) {
      setMode('peek');
      cancelLeave();
      return;
    }
    if (m === 'peek') {
      if (isHovered() || focusInside) {
        cancelLeave();
      } else {
        scheduleLeave();
      }
    }
    // pinned: hover/focus changes don't affect state
  };

  return {
    mode,
    setToggleHovered: (v) => { toggleHovered = v; reevaluate(); },
    setPanelHovered: (v) => { panelHovered = v; reevaluate(); },
    setFocusInside: (v) => { focusInside = v; reevaluate(); },
    togglePin: () => {
      cancelLeave();
      setMode(mode() === 'pinned' ? 'closed' : 'pinned');
    },
    windowBlur: () => {
      if (mode() === 'peek') {
        cancelLeave();
        setMode('closed');
      }
    },
    dispose: () => { cancelLeave(); },
  };
}
