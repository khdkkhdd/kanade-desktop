import { createPlugin } from '../../loader/create-plugin.js';
import { setupBackend } from './backend.js';
import { setupRenderer } from './renderer.js';

export const relationOverlay = createPlugin({
  name: () => 'relation-overlay',
  description: () => 'Display song relations on YouTube video pages',
  backend: { start: (ctx) => setupBackend(ctx) },
  renderer: { start: (ctx) => setupRenderer(ctx) },
});
