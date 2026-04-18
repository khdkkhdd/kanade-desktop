import Store from 'electron-store';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

interface KanadeConfig {
  adminApiKey: string;
  apiBase: string;
}

interface StoreSchema {
  windowState: WindowState;
  startUrl: string;
  lastUrl: string;
  kanade: KanadeConfig;
}

const store = new Store<StoreSchema>({
  defaults: {
    windowState: { width: 1280, height: 800, isMaximized: false },
    startUrl: '',
    lastUrl: '',
    kanade: {
      adminApiKey: '',
      apiBase: process.env.KANADE_API_BASE ?? 'http://localhost:3000/api/v1',
    },
  },
});

export { store };
export type { WindowState, StoreSchema, KanadeConfig };
