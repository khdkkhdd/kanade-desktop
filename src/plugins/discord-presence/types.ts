// Renderer → Main IPC payload
export interface PlayerStateUpdate {
  videoId: string;
  url: string;
  paused: boolean;
  currentTime: number;
  duration: number;   // may be finite DVR window length for YouTube live
  ended: boolean;
  uiLang: string;
  domTitle: string;
  domChannel: string | null;
  isLive: boolean;
}

export type TitleLanguage = 'uilang' | 'main';

// Presence config (store.kanade.presence)
export interface PresenceConfig {
  enabled: boolean;
  autoReconnect: boolean;
  activityTimeoutMinutes: number; // 0 = disabled
  titleLanguage: TitleLanguage;
}

// Per-videoId resolved info — cached
export type ResolvedSongInfo =
  | {
      kind: 'db';
      title: string;
      artists: string;
      originUrl: string | null;
      thumbnailUrl: string;
      videoUrl: string;
    }
  | {
      kind: 'fallback';
      title: string;
      artists: string;
      originUrl: null;
      thumbnailUrl: string;
      videoUrl: string;
    };

// ResolvedSongInfo + live playback state
export interface SongInfo {
  title: string;
  artists: string;
  originUrl: string | null;
  thumbnailUrl: string;
  videoUrl: string;
  videoId: string;
  isPaused: boolean;
  elapsedSeconds: number;
  durationSeconds: number; // may be a finite DVR window for YouTube live
  isLive: boolean;
  isFallback: boolean;
}
