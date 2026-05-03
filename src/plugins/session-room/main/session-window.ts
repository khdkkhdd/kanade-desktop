import { BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isYouTubeHost } from '../shared/is-youtube-host.js';
import { urlsMatchAsSync } from '../shared/url-match.js';

// Self-defined __dirname (see src/index.ts for context — bundler shim disabled
// when @supabase/supabase-js lands in main bundle).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface SessionWindowOptions {
  roomCode: string;
  initialUrl: string;
}

export function createSessionWindow(
  opts: SessionWindowOptions,
  routeToBrowse: (url: string) => void,
): { window: BrowserWindow; setSyncedUrl: (u: string) => void } {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#000',
    show: false,
    title: `Kanade Session — ${opts.roomCode}`,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/preload.cjs'),
      sandbox: false,
      // Keep host-sync broadcast and guest player updates running when the
      // session window is in the background — otherwise Chromium throttles
      // timers / MutationObservers / video timeupdate, freezing sync the
      // moment the user looks at another window.
      backgroundThrottling: false,
      additionalArguments: [
        `--kanade-mode=session`,
        `--kanade-room=${opts.roomCode}`,
      ],
    },
  });

  // Pin the session-room title; otherwise the loaded page's <title> takes over
  // and users can't distinguish browse windows from session windows.
  win.on('page-title-updated', (e) => e.preventDefault());

  win.once('ready-to-show', () => win.show());

  let currentSyncedUrl = opts.initialUrl;

  win.webContents.on('will-navigate', (event, url) => {
    const matches = urlsMatchAsSync(url, currentSyncedUrl);
    console.log('[session-room] DBG will-navigate url=', url, 'currentSyncedUrl=', currentSyncedUrl, 'matchesAsSync=', matches);
    if (matches) return;
    event.preventDefault();
    try {
      const u = new URL(url);
      const yt = isYouTubeHost(u.hostname);
      console.log('[session-room] DBG will-navigate branch hostname=', u.hostname, 'isYouTubeHost=', yt, 'protocol=', u.protocol);
      if (yt) {
        routeToBrowse(url);
      } else if (u.protocol === 'http:' || u.protocol === 'https:') {
        void shell.openExternal(url);
      }
      // else: drop silently (file:, javascript:, etc.)
    } catch {
      // malformed URL — drop
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log('[session-room] DBG setWindowOpenHandler url=', url);
    try {
      const u = new URL(url);
      const yt = isYouTubeHost(u.hostname);
      console.log('[session-room] DBG window-open branch hostname=', u.hostname, 'isYouTubeHost=', yt, 'protocol=', u.protocol);
      if (yt) {
        routeToBrowse(url);
      } else if (u.protocol === 'http:' || u.protocol === 'https:') {
        void shell.openExternal(url);
      }
      // else: drop silently (file:, javascript:, data:, custom-protocol popups never reach the OS)
    } catch {
      // malformed URL — drop
    }
    return { action: 'deny' };
  });

  win.loadURL(opts.initialUrl);

  return { window: win, setSyncedUrl: (u) => { currentSyncedUrl = u; } };
}
