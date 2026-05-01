import type { RendererContext } from '../../../types/plugins.js';

export async function setupBrowseRenderer(_ctx: RendererContext): Promise<void> {
  if ((window as unknown as { kanadeMode?: string }).kanadeMode === 'session') {
    return; // skip in session window
  }
  console.log('[session-room] browse renderer started');
}
