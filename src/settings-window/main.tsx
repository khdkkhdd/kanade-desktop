import { render } from 'solid-js/web';
import { createSignal, onMount } from 'solid-js';
import { t, setLocale, detectLocale } from '../i18n/index.js';
import type { Locale } from '../i18n/dictionaries.js';

type TitleLanguage = 'uilang' | 'main';

interface PresenceConfig {
  enabled: boolean;
  autoReconnect: boolean;
  activityTimeoutMinutes: number;
  titleLanguage: TitleLanguage;
}

interface SettingsShape {
  adminApiKey: string;
  apiBase: string;
  presence: PresenceConfig;
  locale: Locale | null;
}

declare global {
  interface Window {
    kanadeSettings: {
      get: () => Promise<SettingsShape>;
      save: (v: SettingsShape) => Promise<void>;
      onLocaleChanged: (callback: (locale: Locale | null) => void) => void;
    };
  }
}

function App() {
  const [apiKey, setApiKey] = createSignal('');
  const [apiBase, setApiBase] = createSignal('');
  const [enabled, setEnabled] = createSignal(false);
  const [autoReconnect, setAutoReconnect] = createSignal(true);
  const [timeoutMin, setTimeoutMin] = createSignal(10);
  const [titleLang, setTitleLang] = createSignal<TitleLanguage>('uilang');
  const [appLocale, setAppLocale] = createSignal<Locale | null>(null);
  const [saved, setSaved] = createSignal(false);

  onMount(async () => {
    const v = await window.kanadeSettings.get();
    setApiKey(v.adminApiKey);
    setApiBase(v.apiBase);
    setEnabled(v.presence?.enabled ?? false);
    setAutoReconnect(v.presence?.autoReconnect ?? true);
    setTimeoutMin(v.presence?.activityTimeoutMinutes ?? 10);
    setTitleLang(v.presence?.titleLanguage ?? 'uilang');
    setAppLocale(v.locale ?? null);

    // Sync page-context i18n state — preload's setLocale doesn't reach this V8 context
    setLocale(v.locale ?? detectLocale());

    // Live update for when user (or another window) changes locale
    window.kanadeSettings.onLocaleChanged((newLocale) => {
      setLocale(newLocale ?? detectLocale());
    });
  });

  async function save() {
    await window.kanadeSettings.save({
      adminApiKey: apiKey(),
      apiBase: apiBase(),
      presence: {
        enabled: enabled(),
        autoReconnect: autoReconnect(),
        activityTimeoutMinutes: timeoutMin(),
        titleLanguage: titleLang(),
      },
      locale: appLocale(),
    });
    setLocale(appLocale() ?? detectLocale());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inputStyle = 'width: 100%; padding: 8px; background: #1e1e1e; border: 1px solid #3a3a3a; border-radius: 4px; color: #fff; box-sizing: border-box;';
  const labelStyle = 'display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;';
  const sectionStyle = 'border-top: 1px solid #2a2a2a; margin-top: 24px; padding-top: 16px;';
  const sectionHeaderStyle = 'font-size: 14px; color: #ddd; margin-bottom: 12px; font-weight: 600;';
  const checkboxRowStyle = 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; color: #eee;';

  return (
    <div style="font-family: -apple-system, sans-serif; padding: 24px; background: #0f0f0f; color: #fff; min-height: 100vh; box-sizing: border-box;">
      <h1 style="font-size: 20px; margin-top: 0;">{t('settings.title')}</h1>

      <div style="margin-bottom: 16px;">
        <label style={labelStyle}>{t('settings.adminApiKey')}</label>
        <input
          type="password"
          value={apiKey()}
          onInput={(e) => setApiKey(e.currentTarget.value)}
          style={inputStyle}
        />
      </div>

      <div style="margin-bottom: 16px;">
        <label style={labelStyle}>{t('settings.serverApiBase')}</label>
        <input
          type="text"
          value={apiBase()}
          onInput={(e) => setApiBase(e.currentTarget.value)}
          placeholder="http://localhost:3000/api/v1"
          style={inputStyle}
        />
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>{t('settings.discordSection')}</div>

        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={enabled()}
            onChange={(e) => setEnabled(e.currentTarget.checked)}
          />
          {t('settings.discordEnabled')}
        </label>

        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={autoReconnect()}
            onChange={(e) => setAutoReconnect(e.currentTarget.checked)}
          />
          {t('settings.discordAutoReconnect')}
        </label>

        <div style="margin-bottom: 12px;">
          <label style={labelStyle}>{t('settings.idleTimeoutLabel')}</label>
          <input
            type="number"
            min="0"
            max="240"
            value={timeoutMin()}
            onInput={(e) => setTimeoutMin(Number(e.currentTarget.value) || 0)}
            style="width: 100px; padding: 8px; background: #1e1e1e; border: 1px solid #3a3a3a; border-radius: 4px; color: #fff;"
          />
        </div>

        <div style="margin-bottom: 12px;">
          <label style={labelStyle}>{t('settings.titleLanguageLabel')}</label>
          <select
            value={titleLang()}
            onChange={(e) => setTitleLang(e.currentTarget.value as TitleLanguage)}
            style="width: 200px; padding: 8px; background: #1e1e1e; border: 1px solid #3a3a3a; border-radius: 4px; color: #fff;"
          >
            <option value="uilang">{t('settings.titleLanguageUiLang')}</option>
            <option value="main">{t('settings.titleLanguageMain')}</option>
          </select>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style="margin-bottom: 12px;">
          <label style={labelStyle}>{t('settings.appLanguageLabel')}</label>
          <select
            value={appLocale() ?? 'auto'}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setAppLocale(v === 'auto' ? null : (v as Locale));
            }}
            style="width: 200px; padding: 8px; background: #1e1e1e; border: 1px solid #3a3a3a; border-radius: 4px; color: #fff;"
          >
            <option value="auto">{t('settings.appLanguageAuto')}</option>
            <option value="ko">{t('settings.appLanguageKo')}</option>
            <option value="en">{t('settings.appLanguageEn')}</option>
            <option value="ja">{t('settings.appLanguageJa')}</option>
          </select>
        </div>
      </div>

      <button
        onClick={save}
        style="padding: 8px 16px; background: #3a7aff; border: 0; border-radius: 4px; color: #fff; cursor: pointer; margin-top: 16px;"
      >
        {t('settings.saveButton')}
      </button>
      {saved() && <span style="margin-left: 12px; color: #5fb85f;">{t('settings.savedConfirm')}</span>}
    </div>
  );
}

render(() => <App />, document.getElementById('app')!);
