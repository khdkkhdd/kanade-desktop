// src/plugins/session-room/renderer-shared/toast.ts
// Self-contained toast helper — no external dependencies beyond solid-js.
// Uses module-scope Solid signals + a container appended to document.body.
// Idempotent: calling mountToastContainer() twice is safe.

import { createSignal, For } from 'solid-js';
import { render } from 'solid-js/web';

export type ToastKind = 'info' | 'warn' | 'error';

interface Toast {
  id: string;
  text: string;
  kind: ToastKind;
}

// Module-scope reactive state so all calls share the same queue.
const [toasts, setToasts] = createSignal<Toast[]>([]);

let mounted = false;

const TOAST_CSS = `
.kanade-toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 99999;
  pointer-events: none;
  align-items: center;
}
.kanade-toast {
  background: #5a3fff;
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  animation: kanade-toast-in 0.2s ease-out;
  white-space: nowrap;
}
.kanade-toast.warn { background: #ff9800; }
.kanade-toast.error { background: #cc3344; }
@keyframes kanade-toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

function ToastContainer() {
  return (
    <div class="kanade-toast-container">
      <For each={toasts()}>
        {(t) => <div class={`kanade-toast${t.kind !== 'info' ? ` ${t.kind}` : ''}`}>{t.text}</div>}
      </For>
    </div>
  );
}

/**
 * Appends the toast container to document.body and injects CSS.
 * Safe to call multiple times — only mounts once.
 */
export function mountToastContainer(): void {
  if (mounted) return;
  mounted = true;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = TOAST_CSS;
  document.head.appendChild(styleEl);

  // Mount Solid component
  const el = document.createElement('div');
  el.id = 'kanade-toast-root';
  document.body.appendChild(el);
  render(() => <ToastContainer />, el);
}

/**
 * Show a toast notification. Auto-dismissed after durationMs (default 3000ms).
 * Multiple toasts are stacked and each dismissed independently.
 */
export function showToast(text: string, kind: ToastKind = 'info', durationMs = 3000): void {
  const id = Math.random().toString(36).slice(2);
  setToasts((prev) => [...prev, { id, text, kind }]);
  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, durationMs);
}
