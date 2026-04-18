import { createPlugin } from '../../loader/create-plugin.js';
import { setupBackend } from './backend.js';

export const adminChannelMain = createPlugin({
  name: () => 'admin-channel',
  description: () => 'Link YouTube channels to artists via admin API',
  backend: { start: (ctx) => setupBackend(ctx) },
});
