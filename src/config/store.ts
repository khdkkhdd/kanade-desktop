import Store from 'electron-store';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

type TitleLanguage = 'uilang' | 'main';

interface PresenceConfig {
  enabled: boolean;
  autoReconnect: boolean;
  activityTimeoutMinutes: number;
  titleLanguage: TitleLanguage;
}

interface KanadeConfig {
  adminApiKey: string;
  apiBase: string;
  presence: PresenceConfig;
}

interface StoreSchema {
  windowState: WindowState;
  startUrl: string;
  lastUrl: string;
  kanade: KanadeConfig;
}

export const DEFAULT_PRESENCE_CONFIG: PresenceConfig = {
  enabled: false,
  autoReconnect: true,
  activityTimeoutMinutes: 10,
  titleLanguage: 'uilang',
};

const store = new Store<StoreSchema>({
  defaults: {
    windowState: { width: 1280, height: 800, isMaximized: false },
    startUrl: 'https://www.youtube.com',
    lastUrl: '',
    kanade: {
      adminApiKey: '',
      apiBase: process.env.KANADE_API_BASE ?? 'http://localhost:3000/api/v1',
      presence: DEFAULT_PRESENCE_CONFIG,
    },
  },
});

/**
 * 기존 사용자 config에 presence 키가 없을 수 있음 (electron-store `defaults` 는 top-level만 채움).
 * 이 헬퍼는 presence 를 항상 PresenceConfig 로 반환.
 */
export function getPresenceConfig(): PresenceConfig {
  const k = store.get('kanade');
  const saved = k.presence ?? DEFAULT_PRESENCE_CONFIG;
  return { ...DEFAULT_PRESENCE_CONFIG, ...saved };
}

export { store };
export type { WindowState, StoreSchema, KanadeConfig, PresenceConfig, TitleLanguage };
