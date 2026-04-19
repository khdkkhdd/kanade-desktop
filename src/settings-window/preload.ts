import { contextBridge, ipcRenderer } from 'electron';
import type { PresenceConfig } from '../config/store.js';

contextBridge.exposeInMainWorld('kanadeSettings', {
  get: () => ipcRenderer.invoke('settings:get'),
  save: (v: { adminApiKey: string; apiBase: string; presence: PresenceConfig }) =>
    ipcRenderer.invoke('settings:save', v),
});
