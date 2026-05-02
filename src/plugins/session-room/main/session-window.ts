import { BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Self-defined __dirname (see src/index.ts for context — bundler shim disabled
// when @supabase/supabase-js lands in main bundle).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface SessionWindowOptions {
  roomCode: string;
  initialUrl: string;
}

export function createSessionWindow(opts: SessionWindowOptions): BrowserWindow {
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
  win.loadURL(opts.initialUrl);
  return win;
}
