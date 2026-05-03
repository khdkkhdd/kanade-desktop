import { Show } from 'solid-js';

interface BannerProps {
  active: boolean;
  hostName: string;
  memberCount: number;
  onShowSession: () => void;
  onLeave: () => void;
}

export function SessionBanner(p: BannerProps) {
  return (
    <Show when={p.active}>
      <div class="kanade-banner">
        🎵 {p.hostName} Room ({p.memberCount}명)
        <button onClick={p.onShowSession}>세션 창 보기</button>
        <button onClick={p.onLeave}>세션 나가기</button>
      </div>
    </Show>
  );
}
