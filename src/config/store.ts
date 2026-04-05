import Store from 'electron-store';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

interface StoreSchema {
  windowState: WindowState;
  startUrl: string;
  lastUrl: string;
}

const store = new Store<StoreSchema>({
  defaults: {
    windowState: {
      width: 1280,
      height: 800,
      isMaximized: false,
    },
    startUrl: '',
    lastUrl: '',
  },
});

export { store };
export type { WindowState, StoreSchema };
