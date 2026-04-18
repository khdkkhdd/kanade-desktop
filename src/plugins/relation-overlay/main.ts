import { createPlugin } from '../../loader/create-plugin.js';
import { setupBackend } from './backend.js';

export const relationOverlayMain = createPlugin({
  name: () => 'relation-overlay',
  description: () => 'Display song relations on YouTube video pages',
  backend: { start: (ctx) => setupBackend(ctx) },
});
