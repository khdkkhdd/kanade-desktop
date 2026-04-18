export type SupportedLanguage = 'ja' | 'ko' | 'en';

// Unicode 범위:
//   Hangul Syllables:            AC00-D7AF
//   Hiragana:                    3040-309F
//   Katakana:                    30A0-30FF
//   CJK Unified Ideographs:      4E00-9FAF
const HANGUL = /[\uAC00-\uD7AF]/;
const HIRAGANA_KATAKANA = /[\u3040-\u30FF]/;
const CJK = /[\u4E00-\u9FAF]/;

export function detectLanguage(text: string): SupportedLanguage {
  if (HANGUL.test(text)) return 'ko';
  if (HIRAGANA_KATAKANA.test(text)) return 'ja';
  if (CJK.test(text)) return 'ja';
  return 'en';
}
