import { Show } from 'solid-js';

interface BannerProps {
  active: boolean;
  hostName: string;
  memberCount: number;
  canAddCurrent: boolean;
  onShowSession: () => void;
  onLeave: () => void;
  onAddCurrent: () => void;
}

export function SessionBanner(p: BannerProps) {
  return (
    <Show when={p.active}>
      <div class="kanade-banner">
        <span class="kanade-banner-title">🎵 {p.hostName} Room ({p.memberCount}명)</span>
        <button
          class="kanade-banner-add-btn"
          onClick={p.onAddCurrent}
          disabled={!p.canAddCurrent}
          title={p.canAddCurrent ? '현재 영상을 큐에 추가' : '/watch 페이지에서만 사용 가능'}
        >
          <span class="kanade-banner-add-ico">+</span> 이 영상 큐 추가
        </button>
        <span class="kanade-banner-spacer" />
        <button class="kanade-banner-btn" onClick={p.onShowSession}>세션 창 보기</button>
        <button class="kanade-banner-btn" onClick={p.onLeave}>세션 나가기</button>
      </div>
    </Show>
  );
}
