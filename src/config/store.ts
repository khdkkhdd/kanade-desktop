import Store from 'electron-store';
import type { Locale } from '../i18n/dictionaries.js';

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
  locale: Locale | null;
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
      locale: null,
    },
  },
});

/**
 * Existing user configs may not have the `presence` key (electron-store `defaults`
 * only fills top-level keys). This helper always returns a full PresenceConfig.
 */
export function getPresenceConfig(): PresenceConfig {
  const k = store.get('kanade');
  const saved = k.presence ?? DEFAULT_PRESENCE_CONFIG;
  return { ...DEFAULT_PRESENCE_CONFIG, ...saved };
}

/**
 * Returns the user's chosen locale, or null if they have not chosen one.
 * Existing user configs without the `locale` field fall through `?? null`,
 * letting callers fall back to auto-detect.
 */
export function getLocaleSetting(): Locale | null {
  const k = store.get('kanade');
  return k.locale ?? null;
}

export { store };
export type { WindowState, StoreSchema, KanadeConfig, PresenceConfig, TitleLanguage, Locale };
