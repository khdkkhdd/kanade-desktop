// Renderer → Main IPC payload
export interface PlayerStateUpdate {
  videoId: string;
  url: string;
  paused: boolean;
  currentTime: number;
  duration: number;   // Infinity for live streams
  ended: boolean;
  uiLang: string;
  domTitle: string;
  domChannel: string | null;
}

// Presence config (store.kanade.presence)
export interface PresenceConfig {
  enabled: boolean;
  autoReconnect: boolean;
  activityTimeoutMinutes: number; // 0 = disabled
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
  durationSeconds: number; // Infinity for live
  isFallback: boolean;
}
