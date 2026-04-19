import type { RecordingSelection } from '../../../admin/types.js';

export interface VideoLinkSectionProps {
  videoId: string;
  recording: RecordingSelection | null;
  isMainVideo: boolean;
  onChange: (v: boolean) => void;
  /** Edit mode: this video is already the recording's main. Server has no
   *  demote endpoint (a recording must have exactly one main), so lock the
   *  checkbox — users must promote another video to demote this one. */
  lockedAsMain?: boolean;
}

export function VideoLinkSection(props: VideoLinkSectionProps) {
  const forced = () => props.recording?.kind === 'new';
  const locked = () => props.lockedAsMain === true;

  return (
    <div class="kanade-admin-section">
      <div class="kanade-admin-section__title">🎬 Video 링크</div>
      <div style="font-size: 13px; color: #aaa;">platform: youtube</div>
      <div style="font-size: 13px; color: #aaa; margin-bottom: 8px;">externalId: {props.videoId}</div>
      <label
        style={`display: flex; gap: 8px; align-items: center; font-size: 13px; ${forced() || locked() ? 'cursor: not-allowed;' : ''}`}
        title={locked() && !forced() ? '해제하려면 다른 영상을 메인으로 지정하세요' : undefined}
      >
        <input
          type="checkbox"
          checked={forced() || props.isMainVideo}
          disabled={forced() || locked()}
          onChange={(e) => props.onChange(e.currentTarget.checked)}
        />
        메인 영상으로 지정
        {forced() && <span style="font-size: 11px; color: #888;">(신규 recording — 자동 메인)</span>}
        {!forced() && locked() && (
          <span style="font-size: 11px; color: #888;">(다른 영상을 메인으로 지정해야 해제 가능)</span>
        )}
      </label>
    </div>
  );
}
