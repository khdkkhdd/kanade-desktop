import { createPlugin } from '../../loader/create-plugin.js';
import { setupBackend } from './backend.js';
import { setupRenderer } from './renderer.js';

export const adminVideo = createPlugin({
  name: () => 'admin-video',
  description: () => 'Register/edit video-to-song mappings via admin API',
  backend: { start: (ctx) => setupBackend(ctx) },
  renderer: { start: (ctx) => setupRenderer(ctx) },
});
