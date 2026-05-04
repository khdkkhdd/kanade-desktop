import { createSignal, For, Show, createEffect } from 'solid-js';
import type { ChatMessage, MemberKey } from '../../shared/types.js';
import type { RendererContext } from '../../../../types/plugins.js';
import { showToast } from '../../renderer-shared/toast.jsx';
import { shouldShowFrom } from './chat-grouping.js';
import { t } from '../../../../i18n/index.js';

interface Props {
  ctx: RendererContext;
  messages: ChatMessage[];
  myMemberKey: MemberKey;
}

export function ChatTab(p: Props) {
  const [draft, setDraft] = createSignal('');
  const [showNewBadge, setShowNewBadge] = createSignal(false);
  const [atBottom, setAtBottom] = createSignal(true);
  // tracks newest seen message id; preferred over length to handle 50-cap eviction at the FIFO ceiling
  let lastSeenId: string | undefined = undefined;
  let scrollEl: HTMLDivElement | undefined;

  const isAtBottom = (): boolean => {
    if (!scrollEl) return true;
    return scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 8;
  };

  const handleScroll = () => {
    const bottom = isAtBottom();
    setAtBottom(bottom);
    if (bottom) setShowNewBadge(false);
  };

  const scrollToBottom = () => {
    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
    setAtBottom(true);
    setShowNewBadge(false);
  };

  createEffect(() => {
    const lastId = p.messages.at(-1)?.id;
    const newMessages = lastId !== undefined && lastId !== lastSeenId;
    lastSeenId = lastId;
    if (newMessages) {
      if (atBottom()) {
        // defer until <For> flushes new <div> so scrollHeight reflects the new message
        queueMicrotask(() => { if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight; });
      } else {
        setShowNewBadge(true);
      }
    }
  });

  const send = async (): Promise<void> => {
    const text = draft().trim();
    if (!text) return;
    setDraft('');
    setShowNewBadge(false);
    queueMicrotask(() => { if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight; });
    try {
      await p.ctx.ipc.invoke('chat.send', { text });
    } catch (e) {
      console.warn('[session-room] chat.send failed', e);
      showToast(t('session.toastChatSendFailed'), 'error');
    }
  };

  return (
    <div class="kanade-chat">
      <div class="kanade-chat-list" ref={scrollEl} onScroll={handleScroll}>
        <For each={p.messages}>
          {(m, idx) => {
            const prev = idx() > 0 ? p.messages[idx() - 1] : null;
            const showFrom = shouldShowFrom(prev?.from.memberKey, m.from.memberKey);
            const showTime = !prev || fmtTime(prev.ts) !== fmtTime(m.ts);
            const isMine = m.from.memberKey === p.myMemberKey;
            return (
              <div class={`kanade-chat-msg ${isMine ? 'mine' : ''}`}>
                <Show when={showFrom}>
                  <div class="kanade-chat-from">{m.from.displayName}{showTime ? ` · ${fmtTime(m.ts)}` : ''}</div>
                </Show>
                <div class="kanade-chat-bubble">{m.text}</div>
              </div>
            );
          }}
        </For>
      </div>
      <Show when={showNewBadge()}>
        <button class="kanade-chat-newbadge" onClick={scrollToBottom}>{t('session.chatNewBadge')}</button>
      </Show>
      <div class="kanade-chat-input">
        <textarea
          rows={1}
          value={draft()}
          onInput={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            // !e.isComposing skips Enter while an IME is composing (Korean / Japanese / Chinese).
            // Without this, hitting Enter mid-composition would send the partially-composed
            // text and leak the just-committed final jamo into the next draft.
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={t('session.chatPlaceholder')}
        />
      </div>
    </div>
  );
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}
