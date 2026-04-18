import { app, BrowserWindow, ipcMain, Menu, session } from 'electron';
import path from 'node:path';
import { store } from './config/store.js';
import { loadAllMainPlugins, unloadAllMainPlugins } from './loader/main.js';
import { relationOverlayMain } from './plugins/relation-overlay/main.js';
import { adminVideoMain } from './plugins/admin-video/main.js';
import { adminChannelMain } from './plugins/admin-channel/main.js';

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

  // Window state persistence
  win.on('resize', () => saveWindowState(win));
  win.on('move', () => saveWindowState(win));
  win.on('maximize', () => store.set('windowState.isMaximized', true));
  win.on('unmaximize', () => store.set('windowState.isMaximized', false));

  win.once('ready-to-show', () => win.show());

  // URL loading logic
  const startUrl = store.get('startUrl');
  if (!startUrl) {
    // First run: show selection page
    if (process.env.ELECTRON_RENDERER_URL) {
      win.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
      win.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
  } else {
    // Subsequent runs: load last URL or start URL
    const lastUrl = store.get('lastUrl');
    win.loadURL(lastUrl || startUrl);
  }

  // Plugins
  const plugins = {
    'relation-overlay': relationOverlayMain,
    'admin-video': adminVideoMain,
    'admin-channel': adminChannelMain,
  };
  loadAllMainPlugins(plugins, win, ipcMain);

  return win;
}

function setupIPC(win: BrowserWindow): void {
  // First-run URL selection
  ipcMain.on('select-start-url', (_event, url: string) => {
    store.set('startUrl', url);
    store.set('lastUrl', url);
    win.loadURL(url);
  });

  // Navigation change from renderer
  ipcMain.on('navigation:changed', (_event, data: { url: string; videoId: string | null }) => {
    store.set('lastUrl', data.url);
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
    height: 320,
    parent,
    modal: false,
    title: 'Kanade Settings',
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
      label: 'Kanade',
      submenu: [
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
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupSettingsIPC(): void {
  ipcMain.handle('settings:get', () => {
    const k = store.get('kanade');
    return { adminApiKey: k.adminApiKey, apiBase: k.apiBase };
  });
  ipcMain.handle('settings:save', (_e, v: { adminApiKey: string; apiBase: string }) => {
    store.set('kanade', v);
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('settings:changed', v);
    }
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
