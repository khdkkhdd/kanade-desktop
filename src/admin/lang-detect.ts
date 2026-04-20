export type SupportedLanguage = 'ja' | 'ko' | 'en';

// Unicode 범위 (IME 조합 중간 상태까지 커버):
//   Hangul Jamo:                 1100-11FF   (e.g. ᄀ ᅡ — initial/medial during IME)
//   Hangul Compatibility Jamo:   3130-318F   (e.g. ㄱ ㅏ — standalone jamo seen on keypress)
//   Hangul Syllables:            AC00-D7AF   (e.g. 가 나 다 — composed)
//   Hiragana:                    3040-309F
//   Katakana:                    30A0-30FF
//   CJK Unified Ideographs:      4E00-9FAF
const HANGUL = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
const HIRAGANA_KATAKANA = /[\u3040-\u30FF]/;
const CJK = /[\u4E00-\u9FAF]/;

export function detectLanguage(text: string): SupportedLanguage {
  if (HANGUL.test(text)) return 'ko';
  if (HIRAGANA_KATAKANA.test(text)) return 'ja';
  if (CJK.test(text)) return 'ja';
  return 'en';
}
