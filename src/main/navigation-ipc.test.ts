import { describe, it, expect, beforeEach, vi } from 'vitest';

// Capture the handler registered via ipcMain.on so we can invoke it directly.
const handlers = new Map<string, (event: unknown, data: unknown) => void>();
vi.mock('electron', () => ({
  ipcMain: {
    on: (channel: string, handler: (event: unknown, data: unknown) => void) => {
      handlers.set(channel, handler);
    },
  },
}));

const setLastUrl = vi.fn();
vi.mock('../config/store.js', () => ({
  store: {
    set: (key: string, value: unknown) => setLastUrl(key, value),
  },
}));

import { registerNavigationIPC } from './navigation-ipc.js';

type WinStub = { isDestroyed: () => boolean; webContents: object };

function invoke(senderWebContents: object, url: string): void {
  const handler = handlers.get('navigation:changed');
  if (!handler) throw new Error('navigation:changed handler not registered');
  handler({ sender: senderWebContents }, { url, videoId: null });
}

describe('registerNavigationIPC', () => {
  beforeEach(() => {
    handlers.clear();
    setLastUrl.mockClear();
  });

  it('persists lastUrl for a safe YouTube url from the main window', () => {
    const webContents = {};
    const win: WinStub = { isDestroyed: () => false, webContents };
    registerNavigationIPC(() => win as never);

    invoke(webContents, 'https://www.youtube.com/watch?v=abc');

    expect(setLastUrl).toHaveBeenCalledWith('lastUrl', 'https://www.youtube.com/watch?v=abc');
  });

  it('ignores navigation from a window other than the main window', () => {
    const win: WinStub = { isDestroyed: () => false, webContents: {} };
    registerNavigationIPC(() => win as never);

    invoke({}, 'https://www.youtube.com/watch?v=abc');

    expect(setLastUrl).not.toHaveBeenCalled();
  });

  it('does not throw and does not persist when the main window is destroyed', () => {
    const destroyedWin = {
      isDestroyed: () => true,
      get webContents(): object {
        throw new TypeError('Object has been destroyed');
      },
    };
    registerNavigationIPC(() => destroyedWin as never);

    expect(() => invoke({}, 'https://www.youtube.com/watch?v=abc')).not.toThrow();
    expect(setLastUrl).not.toHaveBeenCalled();
  });

  it('does not throw and does not persist when there is no main window', () => {
    registerNavigationIPC(() => null);

    expect(() => invoke({}, 'https://www.youtube.com/watch?v=abc')).not.toThrow();
    expect(setLastUrl).not.toHaveBeenCalled();
  });
});
