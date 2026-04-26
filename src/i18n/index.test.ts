import { describe, it, expect } from 'vitest';
import { setLocale, getLocale, t } from './index.js';

describe('i18n module', () => {
  it('setLocale + getLocale round-trip', () => {
    setLocale('ja');
    expect(getLocale()).toBe('ja');
    setLocale('ko');
    expect(getLocale()).toBe('ko');
  });

  it('t() reflects current locale on each call', () => {
    setLocale('ko');
    const koVal = t('relationOverlay.tabOriginal');
    setLocale('en');
    const enVal = t('relationOverlay.tabOriginal');
    expect(koVal).not.toBe(enVal);
  });
});
