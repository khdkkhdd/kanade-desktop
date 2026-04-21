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
      background: #141414;
      color: #f0f0f0;
      z-index: 9999;
      box-shadow: -12px 0 32px rgba(0,0,0,0.45);
      transform: translateX(100%);
      transition: transform 0.25s cubic-bezier(.2,.8,.2,1);
      display: flex;
      flex-direction: column;
      font-family: "Roboto", "Arial", sans-serif;
    }
    .kanade-admin-drawer.is-open { transform: translateX(0); }

    .kanade-admin-drawer__header {
      padding: 18px 22px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .kanade-admin-drawer__title {
      font-size: 17px;
      font-weight: 600;
      letter-spacing: -0.1px;
    }
    .kanade-admin-drawer__close {
      background: none; border: 0; color: #8a8a8a; cursor: pointer;
      font-size: 22px; line-height: 1;
      width: 32px; height: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 8px;
      transition: background 0.12s, color 0.12s;
    }
    .kanade-admin-drawer__close:hover { background: rgba(255,255,255,0.06); color: #f0f0f0; }

    .kanade-admin-drawer__body {
      flex: 1;
      overflow-y: auto;
      padding: 4px 22px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .kanade-admin-drawer__footer {
      padding: 14px 22px;
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex; gap: 8px; justify-content: flex-end;
      background: rgba(0,0,0,0.2);
    }

    .kanade-admin-section {
      padding: 16px 18px;
      background: #1c1c1c;
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .kanade-admin-section__title {
      font-size: 13px; font-weight: 600; color: #d4d4d4;
      margin: 0;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .kanade-admin-section__title::before {
      content: '';
      width: 3px;
      height: 14px;
      background: #3ea6ff;
      border-radius: 2px;
      display: inline-block;
    }
    .kanade-admin-section--danger { border-color: rgba(220,80,80,0.3); background: rgba(60,20,20,0.18); }
    .kanade-admin-section--danger .kanade-admin-section__title { color: #ff9999; }
    .kanade-admin-section--danger .kanade-admin-section__title::before { background: #dc5050; }
    /* Sub-section header — used for creator / performing-artist groups. Softer than section titles. */
    .kanade-admin-subsection__title {
      font-size: 12px; font-weight: 500; color: #8a8a8a;
      margin: 4px 0 0 0;
      letter-spacing: 0.1px;
    }

    /* Nested sub-card for "create new" forms (new work, new recording, new artist quick-add). */
    .kanade-admin-subcard {
      padding: 14px;
      background: #232323;
      border: 1px solid rgba(255,255,255,0.04);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .kanade-admin-subcard__hint {
      font-size: 11px;
      color: #7a7a7a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .kanade-admin-meta {
      font-size: 12px;
      color: #8a8a8a;
    }
    .kanade-admin-meta--small {
      font-size: 11px;
      color: #6f6f6f;
    }

    .kanade-admin-field-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .kanade-admin-field-row__grow { flex: 1; min-width: 0; }

    .kanade-admin-input {
      width: 100%; padding: 9px 11px; background: #202020;
      border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: #f0f0f0;
      font-size: 13px; box-sizing: border-box;
      font-family: inherit;
      transition: border-color 0.12s, background 0.12s;
    }
    .kanade-admin-input:focus { outline: none; border-color: #3ea6ff; background: #242424; }
    .kanade-admin-input::placeholder { color: #6a6a6a; }
    .kanade-admin-input--narrow { width: 92px; flex: 0 0 auto; }

    .kanade-admin-btn {
      padding: 8px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);
      background: transparent; color: #e0e0e0; font-size: 13px; cursor: pointer;
      font-family: inherit;
      line-height: 1.2;
      transition: background 0.12s, border-color 0.12s, color 0.12s;
    }
    .kanade-admin-btn:hover:not(:disabled) { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.18); }
    .kanade-admin-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .kanade-admin-btn--primary {
      background: #3ea6ff; border-color: #3ea6ff; color: #0b1620;
      font-weight: 600;
    }
    .kanade-admin-btn--primary:hover:not(:disabled) { background: #5fb6ff; border-color: #5fb6ff; }
    .kanade-admin-btn--danger {
      background: #dc5050; border-color: #dc5050; color: #fff;
      font-weight: 500;
    }
    .kanade-admin-btn--danger:hover:not(:disabled) { background: #e66060; border-color: #e66060; }
    .kanade-admin-btn--ghost {
      padding: 6px 10px;
      color: #b0b0b0;
      border-color: transparent;
    }
    .kanade-admin-btn--ghost:hover:not(:disabled) { background: rgba(255,255,255,0.06); border-color: transparent; }
    .kanade-admin-btn--icon {
      width: 32px; padding: 0; height: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      flex: 0 0 auto;
      color: #8a8a8a;
      border-color: transparent;
    }
    .kanade-admin-btn--icon:hover:not(:disabled) { background: rgba(255,255,255,0.06); color: #f0f0f0; border-color: transparent; }
    .kanade-admin-btn--star-active {
      background: rgba(62,166,255,0.14);
      border-color: rgba(62,166,255,0.5);
      color: #7cc0ff;
    }
    .kanade-admin-btn--star-active:hover:not(:disabled) {
      background: rgba(62,166,255,0.2);
      border-color: rgba(62,166,255,0.7);
      color: #a0d4ff;
    }

    .kanade-admin-banner {
      padding: 10px 12px 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      display: flex; gap: 10px; align-items: center;
      border-left: 3px solid transparent;
    }
    .kanade-admin-banner--error { background: rgba(220,80,80,0.1); color: #ffb0b0; border-left-color: #dc5050; }
    .kanade-admin-banner--warn  { background: rgba(220,170,60,0.1); color: #ffd580; border-left-color: #d0a030; }
    .kanade-admin-banner--info  { background: rgba(62,166,255,0.1); color: #a5d0ff; border-left-color: #3ea6ff; }

    /* Entity picker (Work/Recording/Artist search + create) */
    .kanade-admin-picker { position: relative; }
    .kanade-admin-picker__selected {
      padding: 10px 12px;
      background: rgba(62,166,255,0.08);
      border: 1px solid rgba(62,166,255,0.35);
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .kanade-admin-picker__selected-main { font-size: 13px; color: #f0f0f0; font-weight: 500; }
    .kanade-admin-picker__selected-sub { font-size: 11px; color: #8a8a8a; margin-top: 2px; }
    .kanade-admin-picker__selected-sub--original { font-style: italic; color: #7a7a7a; }
    .kanade-admin-popover {
      position: absolute;
      top: calc(100% + 4px); left: 0; right: 0;
      background: #242424;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      max-height: 240px; overflow-y: auto;
      z-index: 10;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .kanade-admin-popover__item {
      padding: 9px 12px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.1s;
    }
    .kanade-admin-popover__item:hover { background: rgba(255,255,255,0.06); }
    .kanade-admin-popover__item-sub { font-size: 11px; color: #8a8a8a; margin-top: 2px; }
    .kanade-admin-popover__item-sub--original { font-style: italic; color: #7a7a7a; }
    .kanade-admin-popover__create {
      padding: 10px 12px;
      cursor: pointer;
      font-size: 13px;
      color: #3ea6ff;
      font-weight: 500;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .kanade-admin-popover__create:hover { background: rgba(62,166,255,0.1); }

    /* Selection list inside RecordingSection (existing recordings) */
    .kanade-admin-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 260px;
      overflow-y: auto;
      padding-right: 2px;
    }
    .kanade-admin-list__item {
      padding: 10px 12px;
      background: #232323;
      border: 1px solid rgba(255,255,255,0.04);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      transition: background 0.12s, border-color 0.12s;
    }
    .kanade-admin-list__item:hover { background: #292929; border-color: rgba(255,255,255,0.12); }
    .kanade-admin-list__item-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
    .kanade-admin-list__item-title { font-size: 13px; color: #f0f0f0; }
    .kanade-admin-list__item-sub {
      font-size: 11px; color: #8a8a8a;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .kanade-admin-list__item-original {
      font-size: 11px;
      color: #7a7a7a;
      font-style: italic;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .kanade-admin-badge {
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 600;
      letter-spacing: 0.2px;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .kanade-admin-badge--origin { background: rgba(62,166,255,0.2); color: #7cc0ff; }

    /* "Selected existing recording" pill state */
    .kanade-admin-selected-pill {
      padding: 10px 12px;
      background: rgba(62,166,255,0.08);
      border: 1px solid rgba(62,166,255,0.35);
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .kanade-admin-selected-pill__label { font-size: 13px; color: #f0f0f0; }

    /* Artist credit rows — 2-line layout so wide role/public controls don't crowd the picker. */
    .kanade-admin-credit-row {
      background: #232323;
      border: 1px solid rgba(255,255,255,0.04);
      padding: 10px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .kanade-admin-credit-row__actions {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .kanade-admin-credit-row__role { flex: 1; min-width: 0; }
    .kanade-admin-checkbox-label {
      font-size: 12px;
      color: #b0b0b0;
      display: inline-flex;
      gap: 5px;
      align-items: center;
      user-select: none;
      cursor: pointer;
    }
    .kanade-admin-checkbox-label input[type="checkbox"] { accent-color: #3ea6ff; }

    /* Inline label (isOrigin, main video, etc.) */
    .kanade-admin-inline-label {
      font-size: 13px;
      color: #d0d0d0;
      display: inline-flex;
      gap: 8px;
      align-items: center;
      user-select: none;
      cursor: pointer;
    }
    .kanade-admin-inline-label--disabled { cursor: not-allowed; color: #7a7a7a; }
    .kanade-admin-inline-label input { accent-color: #3ea6ff; }

    /* Language radio group (Solo/Group in quick add) */
    .kanade-admin-radio-row {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      font-size: 13px;
      color: #d0d0d0;
    }
    .kanade-admin-radio-row__label { font-size: 12px; color: #8a8a8a; margin-right: 2px; }
    .kanade-admin-radio-row input { accent-color: #3ea6ff; }

    /* Footer-aligned helpers */
    .kanade-admin-actions-end {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
      margin-top: 4px;
    }

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
      min-height: 32px;
      padding: 4px 4px 4px 12px;
      background: var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1));
      border: 0;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 500;
      color: var(--yt-spec-text-primary, #fff);
      line-height: 1.2;
    }
    .kanade-channel-chip__label {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
    }
    .kanade-channel-chip__main {
      font-size: 14px;
      font-weight: 500;
    }
    .kanade-channel-chip__original {
      font-size: 12px;
      font-style: italic;
      color: var(--yt-spec-text-secondary, rgba(255,255,255,0.55));
      font-weight: 400;
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
    .kanade-channel-picker__item-name {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .kanade-channel-picker__item-main {
      font-size: 14px;
      color: var(--yt-spec-text-primary, #fff);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .kanade-channel-picker__item-original {
      font-size: 12px;
      font-style: italic;
      color: var(--yt-spec-text-secondary, rgba(255,255,255,0.55));
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
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
