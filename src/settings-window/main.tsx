import { render } from 'solid-js/web';
import { createSignal, onMount } from 'solid-js';

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
}

declare global {
  interface Window {
    kanadeSettings: {
      get: () => Promise<SettingsShape>;
      save: (v: SettingsShape) => Promise<void>;
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
  const [saved, setSaved] = createSignal(false);

  onMount(async () => {
    const v = await window.kanadeSettings.get();
    setApiKey(v.adminApiKey);
    setApiBase(v.apiBase);
    setEnabled(v.presence?.enabled ?? false);
    setAutoReconnect(v.presence?.autoReconnect ?? true);
    setTimeoutMin(v.presence?.activityTimeoutMinutes ?? 10);
    setTitleLang(v.presence?.titleLanguage ?? 'uilang');
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
    });
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
      <h1 style="font-size: 20px; margin-top: 0;">YouTube Settings</h1>

      <div style="margin-bottom: 16px;">
        <label style={labelStyle}>Admin API Key</label>
        <input
          type="password"
          value={apiKey()}
          onInput={(e) => setApiKey(e.currentTarget.value)}
          style={inputStyle}
        />
      </div>

      <div style="margin-bottom: 16px;">
        <label style={labelStyle}>Server API Base</label>
        <input
          type="text"
          value={apiBase()}
          onInput={(e) => setApiBase(e.currentTarget.value)}
          placeholder="http://localhost:3000/api/v1"
          style={inputStyle}
        />
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Discord Presence</div>

        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={enabled()}
            onChange={(e) => setEnabled(e.currentTarget.checked)}
          />
          Discord 상태 표시
        </label>

        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={autoReconnect()}
            onChange={(e) => setAutoReconnect(e.currentTarget.checked)}
          />
          Discord 미실행 시 자동 재연결
        </label>

        <div style="margin-bottom: 12px;">
          <label style={labelStyle}>일시정지 후 자동 해제 (분, 0 = 안 끔)</label>
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
          <label style={labelStyle}>곡 제목 표시 언어</label>
          <select
            value={titleLang()}
            onChange={(e) => setTitleLang(e.currentTarget.value as TitleLanguage)}
            style="width: 200px; padding: 8px; background: #1e1e1e; border: 1px solid #3a3a3a; border-radius: 4px; color: #fff;"
          >
            <option value="uilang">UI 언어 따라가기</option>
            <option value="main">원어 (main)</option>
          </select>
        </div>
      </div>

      <button
        onClick={save}
        style="padding: 8px 16px; background: #3a7aff; border: 0; border-radius: 4px; color: #fff; cursor: pointer; margin-top: 16px;"
      >
        Save
      </button>
      {saved() && <span style="margin-left: 12px; color: #5fb85f;">Saved ✓</span>}
    </div>
  );
}

render(() => <App />, document.getElementById('app')!);
