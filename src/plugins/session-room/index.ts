import { createPlugin } from '../../loader/create-plugin.js';
import { setupSessionRoomMain } from './main/index.js';
import { setupBrowseRenderer } from './renderer-browse/plugin.js';
import { setupSessionRenderer } from './renderer-session/plugin.js';

// Renderer + backend bundle for preload. Main Process must import
// sessionRoomMain from './main.js' instead — importing this file pulls
// renderer modules into the main bundle.
export const sessionRoom = createPlugin({
  name: () => 'session-room',
  description: () => 'Collaborative listening sessions over Supabase Realtime',
  backend: { start: (ctx) => setupSessionRoomMain(ctx) },
  renderer: async (ctx) => {
    await setupBrowseRenderer(ctx);
    await setupSessionRenderer(ctx);
  },
});
