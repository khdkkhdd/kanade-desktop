import type { RendererContext } from '../../types/plugins.js';
import { parseYouTubeInput } from './parse.js';
import { t } from '../../i18n/index.js';

const OVERLAY_ID = 'kanade-url-prompt-overlay';
const STYLE_ID = 'kanade-url-prompt-styles';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    #${OVERLAY_ID} {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 10000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 18vh;
      font-family: "Roboto", "Arial", sans-serif;
      animation: kanade-url-prompt-fade 120ms ease-out;
    }
    @keyframes kanade-url-prompt-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .kanade-url-prompt__card {
      background: #1c1c1c;
      color: #f0f0f0;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 18px;
      width: 560px;
      max-width: calc(100vw - 40px);
      box-shadow: 0 24px 64px rgba(0,0,0,0.55);
      animation: kanade-url-prompt-pop 160ms cubic-bezier(.2,.8,.2,1);
    }
    @keyframes kanade-url-prompt-pop {
      from { transform: translateY(-8px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .kanade-url-prompt__title {
      font-size: 13px;
      color: #b0b0b0;
      margin-bottom: 10px;
      font-weight: 500;
    }
    .kanade-url-prompt__input {
      width: 100%;
      box-sizing: border-box;
      background: #242424;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #f0f0f0;
      font-size: 15px;
      padding: 12px 14px;
      outline: none;
      font-family: inherit;
      transition: border-color 0.12s, background 0.12s;
    }
    .kanade-url-prompt__input:focus {
      border-color: #3ea6ff;
      background: #2a2a2a;
    }
    .kanade-url-prompt__input--error {
      border-color: #dc5050 !important;
    }
    .kanade-url-prompt__error {
      font-size: 12px;
      color: #ff9090;
      margin-top: 8px;
      min-height: 16px;
    }
    .kanade-url-prompt__hint {
      font-size: 11px;
      color: #6a6a6a;
      margin-top: 10px;
      display: flex;
      gap: 14px;
    }
    .kanade-url-prompt__hint kbd {
      background: rgba(255,255,255,0.08);
      padding: 1px 6px;
      border-radius: 4px;
      font-family: inherit;
      font-size: 10px;
      color: #b0b0b0;
    }
  `;
  document.head.appendChild(s);
}

function buildOverlay(): { overlay: HTMLElement; input: HTMLInputElement; error: HTMLElement } {
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  const card = document.createElement('div');
  card.className = 'kanade-url-prompt__card';

  const title = document.createElement('div');
  title.className = 'kanade-url-prompt__title';
  title.textContent = t('urlPrompt.title');

  const input = document.createElement('input');
  input.className = 'kanade-url-prompt__input';
  input.type = 'text';
  input.placeholder = t('urlPrompt.placeholder');
  input.autocomplete = 'off';
  input.spellcheck = false;

  const error = document.createElement('div');
  error.className = 'kanade-url-prompt__error';

  const hint = document.createElement('div');
  hint.className = 'kanade-url-prompt__hint';
  hint.innerHTML =
    `<span><kbd>Enter</kbd> ${t('urlPrompt.actionGo')}</span>` +
    `<span><kbd>Esc</kbd> ${t('urlPrompt.actionClose')}</span>`;

  card.appendChild(title);
  card.appendChild(input);
  card.appendChild(error);
  card.appendChild(hint);
  overlay.appendChild(card);

  return { overlay, input, error };
}

function showPrompt(): void {
  // If one is already open, just focus it instead of stacking.
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    existing.querySelector<HTMLInputElement>('.kanade-url-prompt__input')?.focus();
    return;
  }

  injectStyles();
  const { overlay, input, error } = buildOverlay();
  document.body.appendChild(overlay);

  // Pre-fill from clipboard when the user probably just copied a link.
  void navigator.clipboard.readText().then((text) => {
    if (!input.value && text && parseYouTubeInput(text)) {
      input.value = text.trim();
      input.select();
    }
  }).catch(() => { /* clipboard permission denied — no prefill */ });

  function close(): void {
    overlay.remove();
  }

  function submit(): void {
    const parsed = parseYouTubeInput(input.value);
    if (!parsed) {
      error.textContent = t('urlPrompt.errorInvalid');
      input.classList.add('kanade-url-prompt__input--error');
      return;
    }
    close();
    window.location.href = parsed;
  }

  input.addEventListener('input', () => {
    error.textContent = '';
    input.classList.remove('kanade-url-prompt__input--error');
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submit(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  setTimeout(() => input.focus(), 0);
}

export function setupRenderer(ctx: RendererContext): void {
  ctx.ipc.on('show', () => showPrompt());
}
