import { render } from 'solid-js/web';
import { createSignal, onMount } from 'solid-js';

declare global {
  interface Window {
    kanadeSettings: {
      get: () => Promise<{ adminApiKey: string; apiBase: string }>;
      save: (v: { adminApiKey: string; apiBase: string }) => Promise<void>;
    };
  }
}

function App() {
  const [apiKey, setApiKey] = createSignal('');
  const [apiBase, setApiBase] = createSignal('');
  const [saved, setSaved] = createSignal(false);

  onMount(async () => {
    const v = await window.kanadeSettings.get();
    setApiKey(v.adminApiKey);
    setApiBase(v.apiBase);
  });

  async function save() {
    await window.kanadeSettings.save({ adminApiKey: apiKey(), apiBase: apiBase() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style="font-family: -apple-system, sans-serif; padding: 24px; background: #0f0f0f; color: #fff; min-height: 100vh; box-sizing: border-box;">
      <h1 style="font-size: 20px; margin-top: 0;">Kanade Settings</h1>
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">Admin API Key</label>
        <input
          type="password"
          value={apiKey()}
          onInput={(e) => setApiKey(e.currentTarget.value)}
          style="width: 100%; padding: 8px; background: #1e1e1e; border: 1px solid #3a3a3a; border-radius: 4px; color: #fff; box-sizing: border-box;"
        />
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">Server API Base</label>
        <input
          type="text"
          value={apiBase()}
          onInput={(e) => setApiBase(e.currentTarget.value)}
          placeholder="http://localhost:3000/api/v1"
          style="width: 100%; padding: 8px; background: #1e1e1e; border: 1px solid #3a3a3a; border-radius: 4px; color: #fff; box-sizing: border-box;"
        />
      </div>
      <button
        onClick={save}
        style="padding: 8px 16px; background: #3a7aff; border: 0; border-radius: 4px; color: #fff; cursor: pointer;"
      >
        Save
      </button>
      {saved() && <span style="margin-left: 12px; color: #5fb85f;">Saved ✓</span>}
    </div>
  );
}

render(() => <App />, document.getElementById('app')!);
