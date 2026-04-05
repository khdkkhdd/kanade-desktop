import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import { store } from './config/store.js';
import { loadAllMainPlugins, unloadAllMainPlugins } from './loader/main.js';

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
  const plugins = {};
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

// App lifecycle
app.whenReady().then(() => {
  removeCSP();

  const win = createWindow();
  setupIPC(win);

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
