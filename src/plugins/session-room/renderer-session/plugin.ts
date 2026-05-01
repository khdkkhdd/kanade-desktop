import type { RendererContext } from '../../../types/plugins.js';

export async function setupSessionRenderer(_ctx: RendererContext): Promise<void> {
  if ((window as unknown as { kanadeMode?: string }).kanadeMode !== 'session') {
    return; // skip in browse window
  }
  console.log('[session-room] session renderer started');
}
