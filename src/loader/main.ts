import type { BrowserWindow, IpcMain } from 'electron';
import type { BackendContext, PluginDef } from '../types/plugins.js';

const loadedPlugins = new Map<string, PluginDef>();

function createBackendContext(id: string, win: BrowserWindow, ipcMain: IpcMain): BackendContext {
  return {
    ipc: {
      send: (event, ...args) => win.webContents.send(`plugin:${id}:${event}`, ...args),
      handle: (event, listener) => ipcMain.handle(`plugin:${id}:${event}`, (_e, ...args) => listener(...args)),
      on: (event, listener) => ipcMain.on(`plugin:${id}:${event}`, (_e, ...args) => listener(...args)),
    },
    window: win,
  };
}

export async function loadAllMainPlugins(
  plugins: Record<string, PluginDef>,
  win: BrowserWindow,
  ipcMain: IpcMain,
): Promise<void> {
  for (const [id, def] of Object.entries(plugins)) {
    if (def.config?.enabled === false) continue;

    const ctx = createBackendContext(id, win, ipcMain);

    if (typeof def.backend === 'function') {
      await def.backend(ctx);
    } else if (def.backend?.start) {
      await def.backend.start(ctx);
    }

    loadedPlugins.set(id, def);
  }
}

export async function unloadAllMainPlugins(): Promise<void> {
  for (const [, def] of loadedPlugins) {
    if (typeof def.backend !== 'function' && def.backend?.stop) {
      await def.backend.stop();
    }
  }
  loadedPlugins.clear();
}
