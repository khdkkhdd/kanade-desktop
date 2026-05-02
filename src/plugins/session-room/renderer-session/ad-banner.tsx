import { Show } from 'solid-js';

interface AdBannerProps {
  hostInAd: boolean;
  iAmInAd: boolean;
}

export function AdBanner(props: AdBannerProps) {
  return (
    <Show when={props.hostInAd && !props.iAmInAd}>
      <div class="kanade-ad-banner">▶ 호스트 광고 중...</div>
    </Show>
  );
}
