import type { PluginConfig, PluginDef } from '../types/plugins.js';

export function createPlugin<
  BackendProps = unknown,
  RendererProps = unknown,
  Config extends PluginConfig = PluginConfig,
>(def: PluginDef<BackendProps, RendererProps, Config> & { config?: Config }) {
  return def;
}
