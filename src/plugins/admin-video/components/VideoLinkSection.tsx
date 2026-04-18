import type { RecordingSelection } from '../../../admin/types.js';

export interface VideoLinkSectionProps {
  videoId: string;
  recording: RecordingSelection | null;
  isMainVideo: boolean;
  onChange: (v: boolean) => void;
}

export function VideoLinkSection(props: VideoLinkSectionProps) {
  const forced = () => props.recording?.kind === 'new';

  return (
    <div class="kanade-admin-section">
      <div class="kanade-admin-section__title">🎬 Video 링크</div>
      <div style="font-size: 13px; color: #aaa;">platform: youtube</div>
      <div style="font-size: 13px; color: #aaa; margin-bottom: 8px;">externalId: {props.videoId}</div>
      <label style="display: flex; gap: 8px; align-items: center; font-size: 13px;">
        <input
          type="checkbox"
          checked={forced() || props.isMainVideo}
          disabled={forced()}
          onChange={(e) => props.onChange(e.currentTarget.checked)}
        />
        메인 영상으로 지정
        {forced() && <span style="font-size: 11px; color: #888;">(신규 recording — 자동 메인)</span>}
      </label>
    </div>
  );
}
