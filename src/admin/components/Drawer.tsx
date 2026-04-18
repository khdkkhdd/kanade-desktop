import { JSX, createEffect, createSignal, onCleanup } from 'solid-js';
import { injectAdminStyles } from './styles.js';

export interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  isDirty?: boolean;
  footer?: JSX.Element;
  children: JSX.Element;
}

export function Drawer(props: DrawerProps) {
  injectAdminStyles();
  const [visible, setVisible] = createSignal(false);

  createEffect(() => {
    if (props.open) {
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
    }
  });

  function handleClose() {
    if (props.isDirty && !confirm('변경사항이 저장되지 않았습니다. 계속 닫을까요?')) return;
    props.onClose();
  }

  // Swallow keyboard events so YouTube's global shortcut handlers
  // (k=play/pause, f=fullscreen, digits=seek, …) don't fire while the
  // drawer is focused. Uses capture-phase so we stop propagation before
  // YouTube's document-level listeners see the event.
  let drawerEl: HTMLDivElement | undefined;
  const swallowKey = (e: KeyboardEvent) => { e.stopPropagation(); };

  createEffect(() => {
    const el = drawerEl;
    if (!el) return;
    el.addEventListener('keydown', swallowKey, true);
    el.addEventListener('keyup', swallowKey, true);
    el.addEventListener('keypress', swallowKey, true);
    onCleanup(() => {
      el.removeEventListener('keydown', swallowKey, true);
      el.removeEventListener('keyup', swallowKey, true);
      el.removeEventListener('keypress', swallowKey, true);
    });
  });

  return (
    <>
      <div class={`kanade-admin-overlay ${visible() ? 'is-open' : ''}`} onClick={handleClose} />
      <div ref={drawerEl} class={`kanade-admin-drawer ${visible() ? 'is-open' : ''}`}>
        <div class="kanade-admin-drawer__header">
          <div class="kanade-admin-drawer__title">{props.title}</div>
          <button class="kanade-admin-drawer__close" onClick={handleClose} aria-label="Close">×</button>
        </div>
        <div class="kanade-admin-drawer__body">{props.children}</div>
        {props.footer && <div class="kanade-admin-drawer__footer">{props.footer}</div>}
      </div>
    </>
  );
}
