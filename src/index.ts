import { app, BrowserWindow, ipcMain, Menu, session, shell } from 'electron';
import path from 'node:path';
import { store, getPresenceConfig } from './config/store.js';
import { isSafeWebUrl } from './lib/url-guard.js';
import type { PresenceConfig } from './config/store.js';
import { setupAutoUpdater } from './auto-updater.js';
import { loadAllMainPlugins, unloadAllMainPlugins } from './loader/main.js';
import { relationOverlayMain } from './plugins/relation-overlay/main.js';
import { adminVideoMain } from './plugins/admin-video/main.js';
import { adminChannelMain } from './plugins/admin-channel/main.js';
import { discordPresenceMain } from './plugins/discord-presence/index.js';
import { applyPresenceConfigChange } from './plugins/discord-presence/backend.js';

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

  // URL loading logic. Guard against non-http(s) values sneaking in via
  // `navigation:changed` (e.g. file:// paths from loaded HTML) so the main
  // window always boots to a real web page.
  const startUrl = store.get('startUrl') || 'https://www.youtube.com';
  const lastUrl = store.get('lastUrl');
  const bootUrl = isSafeWebUrl(lastUrl) ? lastUrl : startUrl;
  win.loadURL(bootUrl);

  // Plugins
  const plugins = {
    'relation-overlay': relationOverlayMain,
    'admin-video': adminVideoMain,
    'admin-channel': adminChannelMain,
    'discord-presence': discordPresenceMain,
  };
  loadAllMainPlugins(plugins, win, ipcMain);

  return win;
}

function setupIPC(win: BrowserWindow): void {
  // Navigation change from renderer. Only listen to the main window's
  // webContents (other BrowserWindows like Settings can't poison lastUrl)
  // and double-check the URL via isSafeWebUrl which rejects loopback dev
  // hosts on top of non-http(s) protocols.
  ipcMain.on('navigation:changed', (event, data: { url: string; videoId: string | null }) => {
    if (event.sender !== win.webContents) return;
    if (isSafeWebUrl(data.url)) {
      store.set('lastUrl', data.url);
    }
  });
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

function setupSettingsIPC(): void {
  ipcMain.handle('settings:get', () => {
    const k = store.get('kanade');
    return {
      adminApiKey: k.adminApiKey,
      apiBase: k.apiBase,
      presence: getPresenceConfig(),
    };
  });
  ipcMain.handle('settings:save', (_e, v: { adminApiKey: string; apiBase: string; presence: PresenceConfig }) => {
    store.set('kanade', v);
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('settings:changed', v);
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

  const win = createWindow();
  setupIPC(win);
  setupSettingsIPC();
  installAppMenu(() => win);
  setupAutoUpdater(() => win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWin = createWindow();
      setupIPC(newWin);
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
