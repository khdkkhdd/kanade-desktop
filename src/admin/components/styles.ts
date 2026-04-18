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
      margin-bottom: 20px;
    }
    .kanade-admin-section__title {
      font-size: 13px; font-weight: 600; color: #ccc;
      margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;
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
  `;
}

export function injectAdminStyles(): void {
  if (document.getElementById(ADMIN_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = ADMIN_STYLE_ID;
  s.textContent = getAdminStyles();
  document.head.appendChild(s);
}
