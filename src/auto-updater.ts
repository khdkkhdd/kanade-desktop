import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

/**
 * Wires up electron-updater so production builds check GitHub Releases on
 * launch, download in the background, and then ask the user whether to
 * install immediately or wait for the next quit.
 *
 * Dev (`pnpm dev`) and unpackaged builds skip everything — the updater
 * needs signed, packaged binaries to verify against.
 */
export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) return;

    void dialog
      .showMessageBox(win, {
        type: 'info',
        title: '업데이트 준비됨',
        message: `Kanade ${info.version} 업데이트가 준비됐어요.`,
        detail: '지금 재시작해서 설치하거나, 다음 종료 시 자동 설치돼요.',
        buttons: ['지금 재시작', '나중에'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.on('error', (err) => {
    console.error('[auto-updater]', err);
  });

  void autoUpdater.checkForUpdates();
}
