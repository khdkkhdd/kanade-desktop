import { Show } from 'solid-js';
import { t } from '../../../i18n/index.js';

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
        <span class="kanade-banner-title">🎵 {t('session.bannerTitle', { name: p.hostName, count: String(p.memberCount) })}</span>
        <button
          class="kanade-banner-add-btn"
          onClick={p.onAddCurrent}
          disabled={!p.canAddCurrent}
          title={p.canAddCurrent ? t('session.bannerAddCurrentTooltip') : t('session.bannerAddCurrentDisabledTooltip')}
        >
          <span class="kanade-banner-add-ico">+</span> {t('session.bannerAddCurrent')}
        </button>
        <span class="kanade-banner-spacer" />
        <button class="kanade-banner-btn" onClick={p.onShowSession}>{t('session.bannerShowWindow')}</button>
        <button class="kanade-banner-btn" onClick={p.onLeave}>{t('session.bannerLeave')}</button>
      </div>
    </Show>
  );
}
