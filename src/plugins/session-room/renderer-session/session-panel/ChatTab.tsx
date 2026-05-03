import { createSignal, For, Show, createEffect } from 'solid-js';
import type { ChatMessage, MemberKey } from '../../shared/types.js';
import type { RendererContext } from '../../../../types/plugins.js';

interface Props {
  ctx: RendererContext;
  messages: ChatMessage[];
  myMemberKey: MemberKey;
}

export function ChatTab(p: Props) {
  const [draft, setDraft] = createSignal('');
  const [atBottom, setAtBottom] = createSignal(true);
  const [showNewBadge, setShowNewBadge] = createSignal(false);
  let scrollEl: HTMLDivElement | undefined;
  // tracks newest seen message id; preferred over length to handle 50-cap eviction at the FIFO ceiling
  let lastSeenId: string | undefined = undefined;

  const isAtBottom = (): boolean => {
    if (!scrollEl) return true;
    return scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 8;
  };

  const scrollToBottom = (): void => {
    if (scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
      setShowNewBadge(false);
      setAtBottom(true);
    }
  };

  const handleScroll = (): void => {
    const bottom = isAtBottom();
    setAtBottom(bottom);
    if (bottom) {
      setShowNewBadge(false);
    }
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
    const t = draft().trim();
    if (!t) return;
    setDraft('');
    setShowNewBadge(false);
    // defer until <For> flushes new <div> so scrollHeight reflects the new message
    queueMicrotask(() => { if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight; });
    await p.ctx.ipc.invoke('chat.send', { text: t });
  };

  return (
    <div class="kanade-chat">
      <div class="kanade-chat-list" ref={scrollEl} onScroll={handleScroll}>
        <For each={p.messages}>
          {(m, idx) => {
            const prev = idx() > 0 ? p.messages[idx() - 1] : null;
            const showTime = !prev || fmtTime(prev.ts) !== fmtTime(m.ts);
            return (
              <div class={`kanade-chat-msg ${m.from.memberKey === p.myMemberKey ? 'mine' : ''}`}>
                <div class="from">{m.from.displayName}{showTime ? ` · ${fmtTime(m.ts)}` : ''}</div>
                <div class="text">{m.text}</div>
              </div>
            );
          }}
        </For>
      </div>
      <Show when={showNewBadge()}>
        <button class="kanade-chat-newbadge" onClick={scrollToBottom}>새 메시지 ↓</button>
      </Show>
      <div class="kanade-chat-input">
        <textarea
          rows={1}
          value={draft()}
          onInput={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
        />
      </div>
    </div>
  );
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
