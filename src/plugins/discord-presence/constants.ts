// Application ID for the "YouTube" app on the Discord Developer Portal.
export const clientId = '1495418394672103669';

/** Minimum interval between setActivity calls (ms). Song/pause/seek changes bypass this throttle. */
export const PROGRESS_THROTTLE_MS = 15_000;

/** Minimum interval for forwarding Renderer → Main timeupdate events (ms). */
export const RENDERER_TIMEUPDATE_MIN_MS = 1_000;

/** Hangul filler used to pad text shorter than 2 characters. */
export const HANGUL_FILLER = '\u3164';

/** Maximum length for Discord activity text. */
export const MAX_ACTIVITY_TEXT_LENGTH = 128;

/** Threshold for detecting a seek (seconds). */
export const SEEK_THRESHOLD_SECONDS = 2;

/** Retry interval for Discord connection attempts (ms). */
export const RECONNECT_BACKOFF_MS = 5_000;

export enum TimerKey {
  ClearActivity = 'clearActivity',
  DiscordConnectRetry = 'discordConnectRetry',
}
