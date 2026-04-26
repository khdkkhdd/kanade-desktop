import { contextBridge, ipcRenderer } from 'electron';
import type { PresenceConfig, Locale } from '../config/store.js';
import { setLocale, detectLocale } from '../i18n/index.js';

// Initial sync — settings window 의 i18n 도 사용자 선택 locale 반영
ipcRenderer.invoke('settings:get').then((settings) => {
  if (settings?.locale) setLocale(settings.locale);
}).catch((e) => {
  console.warn('[kanade-settings] i18n init failed:', e);
});

// Live update — 사용자가 locale 바꾸면 자기 창도 즉시 반응
ipcRenderer.on('i18n:locale-changed', (_e, newLocale: Locale | null) => {
  setLocale(newLocale ?? detectLocale());
});

contextBridge.exposeInMainWorld('kanadeSettings', {
  get: () => ipcRenderer.invoke('settings:get'),
  save: (v: {
    adminApiKey: string;
    apiBase: string;
    presence: PresenceConfig;
    locale: Locale | null;
  }) => ipcRenderer.invoke('settings:save', v),
});
