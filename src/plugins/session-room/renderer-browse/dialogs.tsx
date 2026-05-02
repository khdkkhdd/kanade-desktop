// src/plugins/session-room/renderer-browse/dialogs.tsx
import { createSignal, createEffect, Show } from 'solid-js';
import { isValidRoomCode } from '../shared/room-code.js';
import { t } from '../../../i18n/index.js';
import type { PermissionMode } from '../shared/types.js';

const backdropStyle = 'position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100000;';
const modalStyle = 'background: #1a1a1a; color: #fff; padding: 24px; border-radius: 8px; min-width: 360px; max-width: 480px; font-family: -apple-system, sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.5);';
const labelStyle = 'display: block; font-size: 12px; color: #aaa; margin: 12px 0 4px 0;';
const inputStyle = 'width: 100%; padding: 8px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; color: #fff; box-sizing: border-box; font-size: 14px;';
const actionsStyle = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;';
const buttonStyle = 'padding: 8px 16px; border-radius: 4px; border: 0; cursor: pointer; font-size: 14px;';
const cancelBtnStyle = `${buttonStyle} background: #333; color: #ddd;`;
const submitBtnStyle = `${buttonStyle} background: #3a7aff; color: #fff;`;
const errorStyle = 'color: #ff7373; font-size: 12px; margin: 8px 0 0 0;';

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  defaultDisplayName: string;
  onSubmit: (args: { displayName: string; permission: PermissionMode }) => Promise<void>;
}

export function CreateDialog(props: CreateDialogProps) {
  const [name, setName] = createSignal(props.defaultDisplayName);
  const [permission, setPermission] = createSignal<PermissionMode>('playlist');
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');

  createEffect(() => {
    if (props.open) setName(props.defaultDisplayName);
  });

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await props.onSubmit({ displayName: name(), permission: permission() });
      props.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Show when={props.open}>
      <div style={backdropStyle} onClick={props.onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <h2 style="margin: 0 0 8px 0; font-size: 18px;">{t('session.dialogStartTitle')}</h2>
          <label style={labelStyle}>{t('session.displayNameLabel')}</label>
          <input
            style={inputStyle}
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            disabled={busy()}
          />
          <label style={labelStyle}>{t('session.permissionLabel')}</label>
          <select
            style={inputStyle}
            value={permission()}
            onChange={(e) => setPermission(e.currentTarget.value as PermissionMode)}
            disabled={busy()}
          >
            <option value="host-only">{t('session.permissionHostOnly')}</option>
            <option value="playlist">{t('session.permissionPlaylist')}</option>
            <option value="all">{t('session.permissionAll')}</option>
          </select>
          <Show when={error()}>
            <p style={errorStyle}>{error()}</p>
          </Show>
          <div style={actionsStyle}>
            <button style={cancelBtnStyle} disabled={busy()} onClick={props.onClose}>{t('session.cancel')}</button>
            <button style={submitBtnStyle} disabled={busy()} onClick={submit}>{t('session.startBtn')}</button>
          </div>
        </div>
      </div>
    </Show>
  );
}

interface JoinDialogProps {
  open: boolean;
  onClose: () => void;
  defaultDisplayName: string;
  defaultCode?: string;
  onSubmit: (args: { displayName: string; roomCode: string }) => Promise<void>;
}

export function JoinDialog(props: JoinDialogProps) {
  const [name, setName] = createSignal(props.defaultDisplayName);
  const [code, setCode] = createSignal(props.defaultCode ?? '');
  const [error, setError] = createSignal('');
  const [busy, setBusy] = createSignal(false);

  createEffect(() => {
    if (props.open) {
      setName(props.defaultDisplayName);
      setCode(props.defaultCode ?? '');
    }
  });

  const submit = async () => {
    setError('');
    if (!isValidRoomCode(code())) {
      setError(t('session.invalidRoomCodeFormat'));
      return;
    }
    setBusy(true);
    try {
      await props.onSubmit({ displayName: name(), roomCode: code() });
      props.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Show when={props.open}>
      <div style={backdropStyle} onClick={props.onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <h2 style="margin: 0 0 8px 0; font-size: 18px;">{t('session.dialogJoinTitle')}</h2>
          <label style={labelStyle}>{t('session.displayNameLabel')}</label>
          <input
            style={inputStyle}
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            disabled={busy()}
          />
          <label style={labelStyle}>{t('session.roomCodeLabel')}</label>
          <input
            style={inputStyle}
            value={code()}
            onInput={(e) => setCode(e.currentTarget.value.trim().toLowerCase())}
            disabled={busy()}
            maxLength={6}
          />
          <Show when={error()}>
            <p style={errorStyle}>{error()}</p>
          </Show>
          <div style={actionsStyle}>
            <button style={cancelBtnStyle} disabled={busy()} onClick={props.onClose}>{t('session.cancel')}</button>
            <button style={submitBtnStyle} disabled={busy()} onClick={submit}>{t('session.joinBtn')}</button>
          </div>
        </div>
      </div>
    </Show>
  );
}
