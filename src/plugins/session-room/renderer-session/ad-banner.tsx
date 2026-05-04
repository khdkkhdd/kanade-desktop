import { Show } from 'solid-js';
import { t } from '../../../i18n/index.js';

interface AdBannerProps {
  hostInAd: boolean;
  iAmInAd: boolean;
}

export function AdBanner(props: AdBannerProps) {
  return (
    <Show when={props.hostInAd && !props.iAmInAd}>
      <div class="kanade-ad-banner">{t('session.adBannerHostAdInProgress')}</div>
    </Show>
  );
}
