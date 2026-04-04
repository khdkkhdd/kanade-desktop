import type { PluginDef, RendererContext } from '../types/plugins.js';

const loadedPlugins = new Map<string, PluginDef>();

function createRendererContext(id: string): RendererContext {
  return {
    ipc: {
      send: (event, ...args) => window.kanade.ipc.send(`plugin:${id}:${event}`, ...args),
      invoke: (event, ...args) => window.kanade.ipc.invoke(`plugin:${id}:${event}`, ...args),
      on: (event, listener) => window.kanade.ipc.on(`plugin:${id}:${event}`, listener),
    },
  };
}

export async function loadAllRendererPlugins(
  plugins: Record<string, PluginDef>,
): Promise<void> {
  for (const [id, def] of Object.entries(plugins)) {
    if (def.config?.enabled === false) continue;

    const ctx = createRendererContext(id);

    if (typeof def.renderer === 'function') {
      await def.renderer(ctx);
    } else if (def.renderer?.start) {
      await def.renderer.start(ctx);
    }

    loadedPlugins.set(id, def);
  }
}
