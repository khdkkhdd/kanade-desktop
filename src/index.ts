import { app, BrowserWindow, ipcMain, Menu, session, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { store, getPresenceConfig, getLocaleSetting } from './config/store.js';
import { setLocale, normalizeLocale, t } from './i18n/index.js';

// Self-defined __dirname for ESM main bundle. electron-vite normally injects a
// CommonJS shim, but bundling @supabase/supabase-js causes the shim to be
// inserted inside a JSDoc comment block in the supabase source, which silently
// disables it. Define our own up front so all path.join(__dirname, ...) calls
// in this entry resolve correctly.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { isSafeYouTubeUrl } from './lib/url-guard.js';
import { registerNavigationIPC } from './main/navigation-ipc.js';
import type { PresenceConfig, Locale } from './config/store.js';
import { setupAutoUpdater } from './auto-updater.js';
import { loadAllMainPlugins, unloadAllMainPlugins } from './loader/main.js';
import { relationOverlayMain } from './plugins/relation-overlay/main.js';
import { adminVideoMain } from './plugins/admin-video/main.js';
import { adminChannelMain } from './plugins/admin-channel/main.js';
import { discordPresenceMain } from './plugins/discord-presence/main.js';
import { applyPresenceConfigChange } from './plugins/discord-presence/backend.js';
import { createSessionRoomMain } from './plugins/session-room/main.js';

function removeCSP(): void {
  session.defaultSession.webRequest.onHeadersReceived(
    {
      urls: [
        'https://*.youtube.com/*',
        'https://*.youtube-nocookie.com/*',
        'https://*.googlevideo.com/*',
      ],
    },
    (details, callback) => {
      const headers = { ...details.responseHeaders };
      delete headers['content-security-policy'];
      delete headers['content-security-policy-report-only'];
      callback({ responseHeaders: headers });
    },
  );
}

function saveWindowState(win: BrowserWindow): void {
  if (win.isMaximized()) {
    store.set('windowState.isMaximized', true);
  } else {
    const bounds = win.getBounds();
    store.set('windowState', {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: false,
    });
  }
}

function createWindow(): BrowserWindow {
  const windowState = store.get('windowState');

  const win = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 325,
    minHeight: 425,
    backgroundColor: '#000',
    show: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.cjs'),
      sandbox: false,
    },
  });

  if (windowState.isMaximized) {
    win.maximize();
  }

  // Route `target="_blank"` / window.open() clicks to the OS default browser
  // instead of spawning a new Electron window. Lets overlay niconico links
  // open in the user's browser where they're already signed in.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Window state persistence
  win.on('resize', () => saveWindowState(win));
  win.on('move', () => saveWindowState(win));
  win.on('maximize', () => store.set('windowState.isMaximized', true));
  win.on('unmaximize', () => store.set('windowState.isMaximized', false));

  win.once('ready-to-show', () => win.show());

  // Browser-like back/forward navigation. Electron tracks history internally
  // but doesn't bind UI/shortcuts; wire three input paths:
  //   1. macOS trackpad 3-finger swipe (swipe event fires only on macOS)
  //   2. Mouse button 4/5 / OS-level browser back/forward keys (app-command)
  //   3. Menu accelerators Cmd+[ / Cmd+] (installed in installAppMenu below)
  win.on('swipe' as any, (_e: Electron.Event, direction: string) => {
    const nav = win.webContents.navigationHistory;
    if (direction === 'left' && nav.canGoBack()) nav.goBack();
    else if (direction === 'right' && nav.canGoForward()) nav.goForward();
  });
  win.webContents.on('app-command' as any, (_e: Electron.Event, cmd: string) => {
    const nav = win.webContents.navigationHistory;
    if (cmd === 'browser-backward' && nav.canGoBack()) nav.goBack();
    else if (cmd === 'browser-forward' && nav.canGoForward()) nav.goForward();
  });

  // URL loading logic. Boot only resumes a YouTube URL — a `youtube.com/redirect?q=...`
  // wrapper that landed the user on an external domain (or any external URL) gets
  // discarded and we fall back to the YouTube home, so the main window always boots
  // to a real YouTube page.
  const startUrl = store.get('startUrl') || 'https://www.youtube.com';
  const lastUrl = store.get('lastUrl');
  const bootUrl = isSafeYouTubeUrl(lastUrl) ? lastUrl : startUrl;
  win.loadURL(bootUrl);

  // Plugins
  const plugins = {
    'relation-overlay': relationOverlayMain,
    'admin-video': adminVideoMain,
    'admin-channel': adminChannelMain,
    'discord-presence': discordPresenceMain,
    'session-room': createSessionRoomMain({ onSessionActiveChange: refreshSessionMenu }),
  };
  loadAllMainPlugins(plugins, win, ipcMain);

  return win;
}

let settingsWin: BrowserWindow | null = null;

function openSettingsWindow(parent: BrowserWindow): void {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 480,
    height: 460,
    parent,
    modal: false,
    title: 'YouTube Settings',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/settings-preload.cjs'),
      sandbox: false,
    },
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    settingsWin.loadURL(`${process.env.ELECTRON_RENDERER_URL}/settings-window/index.html`);
  } else {
    settingsWin.loadFile(path.join(__dirname, '../renderer/settings-window/index.html'));
  }
  settingsWin.on('closed', () => { settingsWin = null; });
}

// Tracked at module scope so a locale-driven menu rebuild can restore the
// correct enabled flags without waiting for the next session-active transition.
let sessionActive = false;

function applySessionMenuEnabled(): void {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  // Enable session-active items only when in a session
  for (const id of ['session-copy-code', 'session-show', 'session-leave', 'session-add-current'] as const) {
    const item = menu.getMenuItemById(id);
    if (item) item.enabled = sessionActive;
  }
  // Disable new/join when in a session so the user can't destructively double-join
  for (const id of ['session-create', 'session-join'] as const) {
    const item = menu.getMenuItemById(id);
    if (item) item.enabled = !sessionActive;
  }
}

function refreshSessionMenu(active: boolean): void {
  sessionActive = active;
  applySessionMenuEnabled();
}

function installAppMenu(getMainWin: () => BrowserWindow | null): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'YouTube',
      submenu: [
        {
          label: 'Go to URL or Video ID...',
          accelerator: process.platform === 'darwin' ? 'Cmd+L' : 'Ctrl+L',
          click: () => {
            const main = getMainWin();
            main?.webContents.send('plugin:url-prompt:show');
          },
        },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: process.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,',
          click: () => {
            const main = getMainWin();
            if (main) openSettingsWindow(main);
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    {
      label: t('session.menuTitle'),
      submenu: [
        {
          id: 'session-create',
          label: t('session.start'),
          enabled: !sessionActive,
          accelerator: process.platform === 'darwin' ? 'Cmd+Shift+S' : 'Ctrl+Shift+S',
          click: () => {
            const main = getMainWin();
            main?.webContents.send('plugin:session-room:open-create-dialog');
          },
        },
        {
          id: 'session-join',
          label: t('session.join'),
          enabled: !sessionActive,
          accelerator: process.platform === 'darwin' ? 'Cmd+Shift+J' : 'Ctrl+Shift+J',
          click: () => {
            const main = getMainWin();
            main?.webContents.send('plugin:session-room:open-join-dialog');
          },
        },
        { type: 'separator' },
        {
          id: 'session-copy-code',
          label: t('session.copyCode'),
          enabled: sessionActive,
          click: () => {
            // Trigger plugin's main-side handler directly. Renderer-side
            // navigator.clipboard.writeText fails when the document loses
            // focus to a native menu (macOS), so we route through ipcMain
            // instead of webContents.send.
            ipcMain.emit('plugin:session-room:copy-code');
          },
        },
        {
          id: 'session-show',
          label: t('session.showSession'),
          enabled: sessionActive,
          click: () => {
            const main = getMainWin();
            main?.webContents.send('plugin:session-room:show-session-window');
          },
        },
        {
          id: 'session-add-current',
          label: t('session.addCurrent'),
          enabled: sessionActive,
          accelerator: process.platform === 'darwin' ? 'Cmd+Shift+A' : 'Ctrl+Shift+A',
          click: () => {
            const main = getMainWin();
            main?.webContents.send('plugin:session-room:add-current-video');
          },
        },
        {
          id: 'session-leave',
          label: t('session.leave'),
          enabled: sessionActive,
          accelerator: process.platform === 'darwin' ? 'Cmd+Shift+L' : 'Ctrl+Shift+L',
          click: () => {
            const main = getMainWin();
            main?.webContents.send('plugin:session-room:leave');
          },
        },
      ],
    },
    {
      label: 'History',
      submenu: [
        {
          label: 'Back',
          accelerator: process.platform === 'darwin' ? 'Cmd+[' : 'Alt+Left',
          click: () => {
            const main = getMainWin();
            const nav = main?.webContents.navigationHistory;
            if (nav?.canGoBack()) nav.goBack();
          },
        },
        {
          label: 'Forward',
          accelerator: process.platform === 'darwin' ? 'Cmd+]' : 'Alt+Right',
          click: () => {
            const main = getMainWin();
            const nav = main?.webContents.navigationHistory;
            if (nav?.canGoForward()) nav.goForward();
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Persistent reference so settings:save can rebuild the app menu (which uses
// localized labels) without threading the window through every callback.
let mainWin: BrowserWindow | null = null;

function setupSettingsIPC(): void {
  ipcMain.handle('settings:get', () => {
    const k = store.get('kanade');
    return {
      adminApiKey: k.adminApiKey,
      apiBase: k.apiBase,
      presence: getPresenceConfig(),
      locale: k.locale ?? null,
      session: k.session ?? { displayName: '' },
    };
  });
  ipcMain.handle('settings:save', (_e, v: {
    adminApiKey: string;
    apiBase: string;
    presence: PresenceConfig;
    locale: Locale | null;
    session: { displayName: string };
  }) => {
    store.set('kanade', v);
    // Sync the main-process i18n signal — renderers update via the
    // 'i18n:locale-changed' channel below, but main has its own V8 context
    // and would otherwise keep stale labels in any newly-built UI.
    setLocale(v.locale ?? normalizeLocale(app.getLocale()));
    // Rebuild the app menu so the Session submenu picks up the new locale.
    installAppMenu(() => mainWin);
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('settings:changed', v);
      w.webContents.send('i18n:locale-changed', v.locale);
    }
    // Propagate config change to main-side plugins (settings:changed only flows Main→Renderer, so Main can't receive it)
    applyPresenceConfigChange(v.presence);
    return { ok: true };
  });
  ipcMain.on('settings:open', (e) => {
    const sender = BrowserWindow.fromWebContents(e.sender);
    if (sender) openSettingsWindow(sender);
  });
}

// App lifecycle
app.whenReady().then(() => {
  removeCSP();
  // Initialize main-process i18n locale before the first installAppMenu so
  // the Session submenu builds in the user's chosen language on cold start.
  setLocale(getLocaleSetting() ?? normalizeLocale(app.getLocale()));

  mainWin = createWindow();
  registerNavigationIPC(() => mainWin);
  setupSettingsIPC();
  installAppMenu(() => mainWin);
  setupAutoUpdater(() => mainWin);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWin = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  unloadAllMainPlugins();
});
