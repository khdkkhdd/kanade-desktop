import * as i18n from '@solid-primitives/i18n';
import { ko, en, ja, type Locale, type RawDictionary } from './dictionaries.js';

export type { Locale } from './dictionaries.js';

type Dictionary = i18n.Flatten<RawDictionary>;

const flattened: Record<Locale, Dictionary> = {
  ko: i18n.flatten(ko),
  en: i18n.flatten(en),
  ja: i18n.flatten(ja),
};

export function normalizeLocale(raw?: string | null): Locale {
  if (!raw) return 'en';
  const lc = raw.toLowerCase();
  if (lc.startsWith('ko')) return 'ko';
  if (lc.startsWith('ja')) return 'ja';
  return 'en';
}

/**
 * Auto-detect the user's language from the surrounding environment. On
 * YouTube pages the <html lang="..."> attribute reflects the user's chosen
 * YouTube UI language — the closest proxy for how they expect injected
 * overlays to read.
 */
export function detectLocale(): Locale {
  if (typeof document !== 'undefined') {
    const htmlLang = document.documentElement?.lang;
    if (htmlLang) return normalizeLocale(htmlLang);
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeLocale(navigator.language);
  }
  return 'en';
}

let currentLocale: Locale = typeof window === 'undefined' ? 'en' : detectLocale();

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Translator bound to the current locale. Accessor-based so future callers
 * can wire it into a Solid signal if reactive switching becomes needed.
 */
export const t = i18n.translator(() => flattened[currentLocale]);
