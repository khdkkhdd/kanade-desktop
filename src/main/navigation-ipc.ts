import { ipcMain, type BrowserWindow } from 'electron';
import { store } from '../config/store.js';
import { isSafeYouTubeUrl } from '../lib/url-guard.js';

export function registerNavigationIPC(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.on('navigation:changed', (event, data: { url: string; videoId: string | null }) => {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) return;
    if (event.sender !== win.webContents) return;
    if (isSafeYouTubeUrl(data.url)) {
      store.set('lastUrl', data.url);
    }
  });
}
