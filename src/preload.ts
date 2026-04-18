import { contextBridge, ipcRenderer } from 'electron';
import { loadAllRendererPlugins } from './loader/renderer.js';
import { relationOverlay } from './plugins/relation-overlay/index.js';
import { adminVideo } from './plugins/admin-video/index.js';
import { adminChannel } from './plugins/admin-channel/index.js';

// Swallow keyboard events that originate inside any kanade-admin UI so
// YouTube's global shortcut handlers (k=play/pause, f=fullscreen,
// digits=seek, '/'=search, etc.) don't fire while the user is typing.
// Registered at preload-time with capture=true so it runs before any
// YouTube-registered listener on window/document.
const ADMIN_KEYBOARD_SELECTOR = '.kanade-admin-drawer, #kanade-admin-channel-widget';
function swallowAdminKey(e: KeyboardEvent): void {
  const target = e.target as Element | null;
  if (target?.closest?.(ADMIN_KEYBOARD_SELECTOR)) {
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
}
window.addEventListener('keydown', swallowAdminKey, true);
window.addEventListener('keyup', swallowAdminKey, true);
window.addEventListener('keypress', swallowAdminKey, true);

contextBridge.exposeInMainWorld('kanade', {
  version: '0.0.1',
  ipc: {
    send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
    invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: (...args: unknown[]) => void) => {
      ipcRenderer.on(channel, (_event, ...args) => listener(...args));
    },
  },
  platform: {
    isYouTubeMusic: () => location.hostname === 'music.youtube.com',
  },
});

// YouTube navigation detection (runs on every page load)
function extractVideoId(): string | null {
  // Standard: /watch?v=VIDEO_ID
  const param = new URLSearchParams(window.location.search).get('v');
  if (param) return param;

  // Shorts: /shorts/VIDEO_ID
  const shortsMatch = window.location.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}

function onNavigate(): void {
  const videoId = extractVideoId();
  console.log('[kanade] navigated:', window.location.href, 'videoId:', videoId);
  ipcRenderer.send('navigation:changed', {
    url: window.location.href,
    videoId,
  });
}

document.addEventListener('yt-navigate-finish', onNavigate);
window.addEventListener('load', onNavigate);
window.addEventListener('popstate', onNavigate);

// Load renderer plugins
const plugins = {
  'relation-overlay': relationOverlay,
  'admin-video': adminVideo,
  'admin-channel': adminChannel,
};
loadAllRendererPlugins(plugins);
