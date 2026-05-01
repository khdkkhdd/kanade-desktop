import { contextBridge, ipcRenderer } from 'electron';
import { loadAllRendererPlugins } from './loader/renderer.js';
import { relationOverlay } from './plugins/relation-overlay/index.js';
import { adminVideo } from './plugins/admin-video/index.js';
import { adminChannel } from './plugins/admin-channel/index.js';
import { discordPresence } from './plugins/discord-presence/index.js';
import { urlPrompt } from './plugins/url-prompt/index.js';
import { sessionRoom } from './plugins/session-room/index.js';
import { setLocale, detectLocale, type Locale } from './i18n/index.js';


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

const kanadeMode = (process.argv.find((a) => a.startsWith('--kanade-mode=')) ?? '').split('=')[1] || 'browse';
const kanadeRoom = (process.argv.find((a) => a.startsWith('--kanade-room=')) ?? '').split('=')[1] || '';
contextBridge.exposeInMainWorld('kanadeMode', kanadeMode);
contextBridge.exposeInMainWorld('kanadeRoom', kanadeRoom);

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
  'discord-presence': discordPresence,
  'url-prompt': urlPrompt,
  'session-room': sessionRoom,
};

async function initLocale(): Promise<void> {
  try {
    const settings = await ipcRenderer.invoke('settings:get');
    if (settings?.locale) setLocale(settings.locale);
  } catch (e) {
    console.warn('[kanade] i18n init failed:', e);
  }
}

ipcRenderer.on('i18n:locale-changed', (_e, newLocale: Locale | null) => {
  setLocale(newLocale ?? detectLocale());
});

void initLocale().then(() => loadAllRendererPlugins(plugins));
