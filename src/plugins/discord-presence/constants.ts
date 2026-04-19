// Placeholder — Discord Developer Portal에서 "YouTube" 앱 신규 등록 후 교체.
// 앱 생성 전이라도 타입/테스트 컴파일 목적으로 임시 값.
export const clientId = '0000000000000000000';

/** setActivity 호출 최소 간격 (ms). 곡/일시정지/seek 변경은 이 throttle 우회. */
export const PROGRESS_THROTTLE_MS = 15_000;

/** Renderer → Main timeupdate 이벤트 최소 전달 간격 (ms). */
export const RENDERER_TIMEUPDATE_MIN_MS = 1_000;

/** 2자 미만 텍스트 pad용 Hangul filler. */
export const HANGUL_FILLER = '\u3164';

/** Discord 활동 텍스트 최대 길이. */
export const MAX_ACTIVITY_TEXT_LENGTH = 128;

/** Seek 판정 임계값 (seconds). */
export const SEEK_THRESHOLD_SECONDS = 2;

/** Discord connection 재시도 간격 (ms). */
export const RECONNECT_BACKOFF_MS = 5_000;

export enum TimerKey {
  ClearActivity = 'clearActivity',
  UpdateTimeout = 'updateTimeout',
  DiscordConnectRetry = 'discordConnectRetry',
}
