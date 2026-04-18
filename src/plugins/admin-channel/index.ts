import { createPlugin } from '../../loader/create-plugin.js';
import { setupBackend } from './backend.js';
import { setupRenderer } from './renderer.js';

export const adminChannel = createPlugin({
  name: () => 'admin-channel',
  description: () => 'Link YouTube channels to artists via admin API',
  backend: { start: (ctx) => setupBackend(ctx) },
  renderer: { start: (ctx) => setupRenderer(ctx) },
});
