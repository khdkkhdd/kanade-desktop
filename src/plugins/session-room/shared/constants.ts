export const CHANNEL_PREFIX = 'kanade:room:';
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
export const FAIR_ROTATION_GAP = 10000;
export const ADD_SONG_RATE_LIMIT_MS = 5000;
export const HOST_GRACE_MS = 60_000;
export const PRESENCE_TIMEOUT_MS = 15_000;
export const DRIFT_CHECK_INTERVAL_MS = 30_000;
export const DRIFT_CORRECT_THRESHOLD_S = 0.5;
export const CHAT_BUFFER_MAX = 50;
export const TS_SKEW_REJECT_MS = 5 * 60 * 1000;
export const JOIN_SNAPSHOT_TIMEOUT_MS = 5_000;

export const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';
