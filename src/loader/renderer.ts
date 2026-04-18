import { ipcRenderer } from 'electron';
import type { PluginDef, RendererContext } from '../types/plugins.js';

const loadedPlugins = new Map<string, PluginDef>();

function createRendererContext(id: string): RendererContext {
  return {
    ipc: {
      send: (event, ...args) => ipcRenderer.send(`plugin:${id}:${event}`, ...args),
      invoke: (event, ...args) => ipcRenderer.invoke(`plugin:${id}:${event}`, ...args),
      on: (event, listener) => ipcRenderer.on(`plugin:${id}:${event}`, (_e, ...args) => listener(...args)),
    },
  };
}

export async function loadAllRendererPlugins(
  plugins: Record<string, PluginDef>,
): Promise<void> {
  for (const [id, def] of Object.entries(plugins)) {
    if (def.config?.enabled === false) continue;

    console.log('[kanade-loader] starting renderer plugin:', id);
    const ctx = createRendererContext(id);

    try {
      if (typeof def.renderer === 'function') {
        await def.renderer(ctx);
      } else if (def.renderer?.start) {
        await def.renderer.start(ctx);
      }
      console.log('[kanade-loader] loaded renderer plugin:', id);
    } catch (err) {
      console.error('[kanade-loader] FAILED renderer plugin:', id, err);
    }

    loadedPlugins.set(id, def);
  }
}
