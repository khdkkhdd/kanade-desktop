/**
 * User-facing string dictionaries. Admin-only UI (drawer, channel widget,
 * cleanup page) stays hardcoded Korean — only strings visible to end users
 * live here (url-prompt overlay, relation-overlay labels, etc.).
 *
 * Keep structures identical between locales so the shared type stays
 * exhaustive. `ko` is the source-of-truth shape.
 */

export const ko = {
  urlPrompt: {
    title: '유튜브 URL 또는 영상 ID',
    placeholder: 'https://youtu.be/... 또는 11자 영상 ID',
    errorInvalid: '올바른 유튜브 URL 또는 11자 영상 ID가 아닙니다.',
    actionGo: '이동',
    actionClose: '닫기',
  },
  relationOverlay: {
    tabOriginal: '원곡',
    tabSameRecording: '다른 업로드',
    tabCovers: '커버',
    tabArtists: '아티스트',
    emptyNoRecordings: '녹음 없음',
  },
  settings: {
    title: '환경설정',
    adminApiKey: '어드민 API 키',
    serverApiBase: '서버 API URL',
    discordSection: 'Discord Presence',
    discordEnabled: 'Discord 상태 표시',
    discordAutoReconnect: 'Discord 미실행 시 자동 재연결',
    idleTimeoutLabel: '일시정지 후 자동 해제 (분, 0 = 안 끔)',
    titleLanguageLabel: '곡 제목 표시 언어',
    titleLanguageUiLang: 'UI 언어 따라가기',
    titleLanguageMain: '원어 (main)',
    appLanguageLabel: '앱 언어',
    appLanguageAuto: '자동 감지',
    appLanguageKo: '한국어',
    appLanguageEn: 'English',
    appLanguageJa: '日本語',
    saveButton: '저장',
    savedConfirm: '저장됨 ✓',
  },
};

export const en: typeof ko = {
  urlPrompt: {
    title: 'YouTube URL or Video ID',
    placeholder: 'https://youtu.be/... or 11-character video ID',
    errorInvalid: 'Not a valid YouTube URL or 11-character video ID.',
    actionGo: 'to go',
    actionClose: 'to close',
  },
  relationOverlay: {
    tabOriginal: 'Original',
    tabSameRecording: 'Other uploads',
    tabCovers: 'Covers',
    tabArtists: 'Artists',
    emptyNoRecordings: 'No recordings',
  },
  settings: {
    title: 'Settings',
    adminApiKey: 'Admin API Key',
    serverApiBase: 'Server API Base',
    discordSection: 'Discord Presence',
    discordEnabled: 'Show Discord status',
    discordAutoReconnect: 'Auto-reconnect when Discord starts',
    idleTimeoutLabel: 'Auto-clear after pause (minutes, 0 = never)',
    titleLanguageLabel: 'Song title language',
    titleLanguageUiLang: 'Follow UI language',
    titleLanguageMain: 'Original (main)',
    appLanguageLabel: 'App language',
    appLanguageAuto: 'Auto-detect',
    appLanguageKo: '한국어',
    appLanguageEn: 'English',
    appLanguageJa: '日本語',
    saveButton: 'Save',
    savedConfirm: 'Saved ✓',
  },
};

export const ja: typeof ko = {
  urlPrompt: {
    title: 'YouTube URL または動画 ID',
    placeholder: 'https://youtu.be/... または 11 桁の動画 ID',
    errorInvalid: '有効な YouTube URL または 11 桁の動画 ID ではありません。',
    actionGo: 'で移動',
    actionClose: 'で閉じる',
  },
  relationOverlay: {
    tabOriginal: '原曲',
    tabSameRecording: '他のアップロード',
    tabCovers: 'カバー',
    tabArtists: 'アーティスト',
    emptyNoRecordings: '録音なし',
  },
  settings: {
    title: '設定',
    adminApiKey: '管理者 API キー',
    serverApiBase: 'サーバー API ベース',
    discordSection: 'Discord Presence',
    discordEnabled: 'Discord ステータスを表示',
    discordAutoReconnect: 'Discord 起動時に自動再接続',
    idleTimeoutLabel: '一時停止後の自動解除 (分、0 = 無効)',
    titleLanguageLabel: '曲タイトルの表示言語',
    titleLanguageUiLang: 'UI 言語に従う',
    titleLanguageMain: '原語 (main)',
    appLanguageLabel: 'アプリ言語',
    appLanguageAuto: '自動検出',
    appLanguageKo: '한국어',
    appLanguageEn: 'English',
    appLanguageJa: '日本語',
    saveButton: '保存',
    savedConfirm: '保存しました ✓',
  },
};

export type Locale = 'ko' | 'en' | 'ja';
export type RawDictionary = typeof ko;
