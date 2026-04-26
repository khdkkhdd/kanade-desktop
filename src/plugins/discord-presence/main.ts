import { createPlugin } from '../../loader/create-plugin.js';
import { setupBackend, stopBackend } from './backend.js';

// Backend-only entry. Imported by src/index.ts (Main Process) so the
// renderer module — which imports ipcRenderer — is never loaded into the
// main bundle. Matches the relation-overlay/main.ts pattern.
export const discordPresenceMain = createPlugin({
  name: () => 'discord-presence',
  description: () => 'Discord Rich Presence for YouTube playback',
  backend: {
    start: (ctx) => setupBackend(ctx),
    stop: () => stopBackend(),
  },
});
