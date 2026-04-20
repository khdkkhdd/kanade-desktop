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
};

export type Locale = 'ko' | 'en' | 'ja';
export type RawDictionary = typeof ko;
