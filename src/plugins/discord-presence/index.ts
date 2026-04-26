import { createPlugin } from '../../loader/create-plugin.js';
import { setupBackend, stopBackend } from './backend.js';
import { setupRenderer } from './renderer.js';

// Renderer + backend bundle for preload (renderer environment).
// Main Process must import discordPresenceMain from './main.js' instead —
// importing this file would pull renderer.ts (with ipcRenderer) into the
// main bundle, which fails since main's 'electron' module has no ipcRenderer.
export const discordPresence = createPlugin({
  name: () => 'discord-presence',
  description: () => 'Discord Rich Presence for YouTube playback',
  backend: {
    start: (ctx) => setupBackend(ctx),
    stop: () => stopBackend(),
  },
  renderer: { start: (ctx) => setupRenderer(ctx) },
});
