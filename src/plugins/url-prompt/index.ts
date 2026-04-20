import { createPlugin } from '../../loader/create-plugin.js';
import { setupRenderer } from './renderer.js';

export const urlPrompt = createPlugin({
  name: () => 'url-prompt',
  description: () => 'Jump to a YouTube URL or video ID via ⌘L',
  renderer: { start: (ctx) => setupRenderer(ctx) },
});
