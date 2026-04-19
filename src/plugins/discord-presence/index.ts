import { createPlugin } from '../../loader/create-plugin.js';
import { setupBackend, stopBackend } from './backend.js';
import { setupRenderer } from './renderer.js';

export const discordPresence = createPlugin({
  name: () => 'discord-presence',
  description: () => 'Discord Rich Presence for YouTube playback',
  backend: {
    start: (ctx) => setupBackend(ctx),
    stop: () => stopBackend(),
  },
  renderer: { start: (ctx) => setupRenderer(ctx) },
});

// Backend-only export for Main Process registration (matches relation-overlay/main.ts pattern).
export const discordPresenceMain = createPlugin({
  name: () => 'discord-presence',
  description: () => 'Discord Rich Presence for YouTube playback',
  backend: {
    start: (ctx) => setupBackend(ctx),
    stop: () => stopBackend(),
  },
});
