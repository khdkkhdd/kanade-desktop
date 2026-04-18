import { createPlugin } from '../../loader/create-plugin.js';
import { setupBackend } from './backend.js';

export const adminVideoMain = createPlugin({
  name: () => 'admin-video',
  description: () => 'Register/edit video-to-song mappings via admin API',
  backend: { start: (ctx) => setupBackend(ctx) },
});
