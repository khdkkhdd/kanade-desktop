export const ADMIN_STYLE_ID = 'kanade-admin-styles';

export function getAdminStyles(): string {
  return `
    .kanade-admin-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 9998;
      opacity: 0;
      transition: opacity 0.2s ease-out;
    }
    .kanade-admin-overlay.is-open { opacity: 1; }

    .kanade-admin-drawer {
      position: fixed;
      top: 0; right: 0; bottom: 0;
      width: 480px;
      max-width: 100vw;
      background: #1f1f1f;
      color: #fff;
      z-index: 9999;
      box-shadow: -4px 0 16px rgba(0,0,0,0.3);
      transform: translateX(100%);
      transition: transform 0.25s cubic-bezier(.2,.8,.2,1);
      display: flex;
      flex-direction: column;
      font-family: "Roboto", "Arial", sans-serif;
    }
    .kanade-admin-drawer.is-open { transform: translateX(0); }

    .kanade-admin-drawer__header {
      padding: 16px 20px;
      border-bottom: 1px solid #3a3a3a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .kanade-admin-drawer__title { font-size: 16px; font-weight: 600; }
    .kanade-admin-drawer__close {
      background: none; border: 0; color: #aaa; cursor: pointer;
      font-size: 20px; padding: 4px 8px; border-radius: 4px;
    }
    .kanade-admin-drawer__close:hover { background: rgba(255,255,255,0.08); color: #fff; }

    .kanade-admin-drawer__body {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
    }

    .kanade-admin-drawer__footer {
      padding: 12px 20px;
      border-top: 1px solid #3a3a3a;
      display: flex; gap: 8px; justify-content: flex-end;
    }

    .kanade-admin-section {
      margin-bottom: 16px;
      padding: 14px 16px;
      background: rgba(255,255,255,0.02);
      border: 1px solid #2d2d2d;
      border-radius: 8px;
    }
    .kanade-admin-section__title {
      font-size: 12px; font-weight: 600; color: #bbb;
      margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.6px;
    }
    /* Sub-section header inside a section card (e.g. "창작자" inside Work, "참여 아티스트" inside Recording) */
    .kanade-admin-subsection__title {
      font-size: 11px; font-weight: 500; color: #8a8a8a;
      margin: 14px 0 8px 0;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.06);
      letter-spacing: 0.3px;
    }

    .kanade-admin-input {
      width: 100%; padding: 8px 10px; background: #2a2a2a;
      border: 1px solid #3a3a3a; border-radius: 4px; color: #fff;
      font-size: 13px; box-sizing: border-box;
    }
    .kanade-admin-input:focus { outline: 1px solid #3a7aff; border-color: #3a7aff; }

    .kanade-admin-btn {
      padding: 8px 14px; border-radius: 4px; border: 1px solid #3a3a3a;
      background: #2a2a2a; color: #fff; font-size: 13px; cursor: pointer;
    }
    .kanade-admin-btn:hover:not(:disabled) { background: #3a3a3a; }
    .kanade-admin-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .kanade-admin-btn--primary { background: #3a7aff; border-color: #3a7aff; }
    .kanade-admin-btn--primary:hover:not(:disabled) { background: #4a8aff; }
    .kanade-admin-btn--danger { background: #c03030; border-color: #c03030; }

    .kanade-admin-banner {
      padding: 10px 12px; border-radius: 4px; margin-bottom: 12px;
      font-size: 13px; display: flex; gap: 8px; align-items: center;
    }
    .kanade-admin-banner--error { background: rgba(192,48,48,0.2); color: #ff8080; border: 1px solid #c03030; }
    .kanade-admin-banner--warn  { background: rgba(192,160,48,0.2); color: #ffc860; border: 1px solid #c0a030; }
    .kanade-admin-banner--info  { background: rgba(48,96,192,0.2); color: #80b0ff; border: 1px solid #3060c0; }

    .kanade-admin-fab {
      position: fixed; bottom: 80px; right: 24px;
      width: 48px; height: 48px; border-radius: 50%;
      background: #3a7aff; border: 0; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      z-index: 9997;
    }
    .kanade-admin-fab:hover { background: #4a8aff; transform: scale(1.05); }
    .kanade-admin-fab--edit { background: #2a2a2a; }
    .kanade-admin-fab--edit:hover { background: #3a3a3a; }

    /* Channel tab panel — takes over YouTube's content area when Kanade tab is active.
       All colors use YouTube's own CSS vars so we adapt to light/dark mode automatically.
       Fallbacks target dark mode for the rare case vars aren't injected. */
    .kanade-channel-panel {
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 40px 48px;
      font-family: "Roboto","Arial",sans-serif;
      color: var(--yt-spec-text-primary, #f1f1f1);
      animation: kanadeChannelPanelIn 140ms ease-out;
    }
    @keyframes kanadeChannelPanelIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .kanade-channel-panel__title {
      font-size: 20px;
      font-weight: 500;
      margin: 0 0 8px 0;
      color: var(--yt-spec-text-primary, #f1f1f1);
    }
    .kanade-channel-panel__subtitle {
      font-size: 14px;
      color: var(--yt-spec-text-secondary, rgba(255,255,255,0.65));
      margin: 0 0 24px 0;
      line-height: 1.4;
    }

    /* Channel widget — blends into YouTube's native chip/button style */
    .kanade-channel-widget {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      color: var(--yt-spec-text-primary, #f1f1f1);
      font-family: "Roboto","Arial",sans-serif;
      max-width: 100%;
    }
    .kanade-channel-widget__row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .kanade-channel-widget__empty {
      font-size: 14px;
      color: var(--yt-spec-text-secondary, rgba(255,255,255,0.6));
      padding: 0 4px;
    }
    .kanade-channel-chip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: 32px;
      padding: 0 4px 0 12px;
      background: var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1));
      border: 0;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 500;
      color: var(--yt-spec-text-primary, #fff);
      line-height: 1;
    }
    .kanade-channel-chip__remove {
      width: 24px; height: 24px;
      border: 0;
      background: transparent;
      color: var(--yt-spec-text-secondary, rgba(255,255,255,0.7));
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .kanade-channel-chip__remove:hover {
      background: var(--yt-spec-button-chip-background-hover, rgba(255,255,255,0.15));
      color: var(--yt-spec-text-primary, #fff);
    }
    .kanade-channel-chip--add {
      display: inline-flex;
      align-items: center;
      height: 32px;
      padding: 0 14px;
      background: transparent;
      border: 1px solid var(--yt-spec-call-to-action, #3ea6ff);
      border-radius: 16px;
      color: var(--yt-spec-call-to-action, #3ea6ff);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      line-height: 1;
    }
    .kanade-channel-chip--add:hover {
      background: color-mix(in srgb, var(--yt-spec-call-to-action, #3ea6ff) 12%, transparent);
    }
    .kanade-channel-chip--ghost {
      display: inline-flex;
      align-items: center;
      height: 32px;
      padding: 0 14px;
      background: transparent;
      border: 1px solid var(--yt-spec-outline, rgba(255,255,255,0.2));
      border-radius: 16px;
      color: var(--yt-spec-text-primary, rgba(255,255,255,0.85));
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      line-height: 1;
    }
    .kanade-channel-chip--ghost:hover {
      background: var(--yt-spec-button-chip-background-hover, rgba(255,255,255,0.1));
    }
    /* Inline artist picker — YouTube-native tone, used inside the Kanade tab panel.
       All colors via YouTube CSS vars so light/dark modes are handled automatically. */
    .kanade-channel-picker {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 20px;
      background: var(--yt-spec-badge-chip-background, rgba(255,255,255,0.04));
      border: 1px solid var(--yt-spec-outline, rgba(255,255,255,0.08));
      border-radius: 12px;
      width: 100%;
      max-width: 560px;
      color: var(--yt-spec-text-primary, #f1f1f1);
    }
    .kanade-channel-picker__input {
      width: 100%;
      box-sizing: border-box;
      height: 40px;
      padding: 0 14px;
      background: var(--yt-spec-general-background-a, rgba(255,255,255,0.08));
      border: 1px solid var(--yt-spec-outline, rgba(255,255,255,0.1));
      border-radius: 8px;
      color: var(--yt-spec-text-primary, #fff);
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.12s, background 0.12s;
    }
    .kanade-channel-picker__input:focus {
      border-color: var(--yt-spec-call-to-action, #3ea6ff);
    }
    .kanade-channel-picker__input--grow { flex: 1; }
    .kanade-channel-picker__list {
      display: flex;
      flex-direction: column;
      max-height: 420px;
      overflow-y: auto;
      gap: 2px;
    }
    .kanade-channel-picker__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      background: transparent;
      border: 0;
      border-radius: 8px;
      color: var(--yt-spec-text-primary, #fff);
      font-size: 14px;
      font-family: inherit;
      text-align: left;
      cursor: pointer;
    }
    .kanade-channel-picker__item:hover {
      background: var(--yt-spec-button-chip-background-hover, rgba(255,255,255,0.08));
    }
    .kanade-channel-picker__item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .kanade-channel-picker__item-type {
      font-size: 11px;
      color: var(--yt-spec-text-secondary, rgba(255,255,255,0.55));
      text-transform: uppercase;
      letter-spacing: 0.4px;
      flex-shrink: 0;
    }
    .kanade-channel-picker__empty {
      padding: 18px 14px;
      text-align: center;
      color: var(--yt-spec-text-secondary, rgba(255,255,255,0.55));
      font-size: 13px;
    }
    .kanade-channel-picker__create-trigger {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 12px 14px;
      margin-top: 4px;
      background: transparent;
      border: 0;
      border-top: 1px solid var(--yt-spec-outline, rgba(255,255,255,0.08));
      border-radius: 0;
      color: var(--yt-spec-call-to-action, #3ea6ff);
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      text-align: left;
      cursor: pointer;
    }
    .kanade-channel-picker__create-trigger:hover {
      background: color-mix(in srgb, var(--yt-spec-call-to-action, #3ea6ff) 8%, transparent);
    }
    .kanade-channel-picker__create-hint {
      font-size: 12px;
      color: var(--yt-spec-text-secondary, rgba(255,255,255,0.5));
      font-weight: 400;
    }
    .kanade-channel-picker__create-header {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 500;
      color: var(--yt-spec-text-primary, rgba(255,255,255,0.9));
    }
    .kanade-channel-picker__back {
      background: transparent;
      border: 0;
      color: var(--yt-spec-call-to-action, #3ea6ff);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .kanade-channel-picker__back:hover {
      background: color-mix(in srgb, var(--yt-spec-call-to-action, #3ea6ff) 10%, transparent);
    }
    .kanade-channel-picker__create-row {
      display: flex;
      gap: 8px;
    }
    .kanade-channel-picker__select {
      height: 40px;
      padding: 0 12px;
      background: var(--yt-spec-general-background-a, rgba(255,255,255,0.08));
      border: 1px solid var(--yt-spec-outline, rgba(255,255,255,0.1));
      border-radius: 8px;
      color: var(--yt-spec-text-primary, #fff);
      font-size: 14px;
      font-family: inherit;
      outline: none;
      min-width: 110px;
    }
    .kanade-channel-picker__type {
      display: flex;
      gap: 20px;
      align-items: center;
      font-size: 14px;
      color: var(--yt-spec-text-primary, rgba(255,255,255,0.8));
    }
    .kanade-channel-picker__type label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .kanade-channel-picker__actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .kanade-channel-chip--add:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
}

export function injectAdminStyles(): void {
  if (document.getElementById(ADMIN_STYLE_ID)) return;
  // Preload runs before <head> is parsed on some pages, so fall back to
  // documentElement and defer to DOMContentLoaded if neither is ready yet.
  const target = document.head ?? document.documentElement;
  if (!target) {
    document.addEventListener('DOMContentLoaded', () => injectAdminStyles(), { once: true });
    return;
  }
  const s = document.createElement('style');
  s.id = ADMIN_STYLE_ID;
  s.textContent = getAdminStyles();
  target.appendChild(s);
}
