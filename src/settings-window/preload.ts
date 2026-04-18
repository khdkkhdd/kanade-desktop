import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('kanadeSettings', {
  get: () => ipcRenderer.invoke('settings:get'),
  save: (v: { adminApiKey: string; apiBase: string }) =>
    ipcRenderer.invoke('settings:save', v),
});
