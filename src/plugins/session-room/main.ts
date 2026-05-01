import { createPlugin } from '../../loader/create-plugin.js';
import { setupSessionRoomMain } from './main/index.js';

// Backend-only entry. Imported by src/index.ts (Main Process) so the
// renderer modules — which run window-mode dispatch — are never loaded
// into the main bundle. Matches discord-presence/main.ts pattern.
export const sessionRoomMain = createPlugin({
  name: () => 'session-room',
  description: () => 'Collaborative listening sessions over Supabase Realtime',
  backend: { start: (ctx) => setupSessionRoomMain(ctx) },
});
