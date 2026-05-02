import * as i18n from '@solid-primitives/i18n';
import { createSignal } from 'solid-js';
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

const initial: Locale = typeof window === 'undefined' ? 'en' : detectLocale();
const [locale, setLocaleSignal] = createSignal<Locale>(initial);

export function setLocale(newLocale: Locale): void {
  setLocaleSignal(newLocale);
}

export function getLocale(): Locale {
  return locale();
}

/**
 * Translator bound to the current locale signal. Because the accessor reads
 * `locale()`, any SolidJS reactive scope calling `t(...)` automatically
 * re-runs when `setLocale()` is invoked.
 */
export const t = i18n.translator(() => flattened[locale()], i18n.resolveTemplate);
