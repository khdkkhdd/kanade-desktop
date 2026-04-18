import { createSignal, createResource, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { WorkSelection, RecordingSelection, RegisterVideoPayload } from '../../../admin/types.js';
import { Drawer } from '../../../admin/components/Drawer.js';
import { WorkSection } from './WorkSection.js';
import { RecordingSection } from './RecordingSection.js';
import { VideoLinkSection } from './VideoLinkSection.js';

export interface VideoDrawerProps {
  videoId: string;
  mode: 'create' | 'edit';
  initialData: any;
  ctx: RendererContext;
  onClose: () => void;
  onCommitted: () => void;
}

export function VideoDrawer(props: VideoDrawerProps) {
  const [work, setWork] = createSignal<WorkSelection | null>(null);
  const [recording, setRecording] = createSignal<RecordingSelection | null>(null);
  const [isMainVideo, setIsMainVideo] = createSignal(true);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const channelExternalId = () => {
    const meta = document.querySelector('meta[itemprop="channelId"]') as HTMLMetaElement | null;
    return meta?.content ?? '';
  };

  const [channelHint] = createResource(
    () => channelExternalId(),
    async (cid) => {
      if (!cid) return undefined;
      const r = (await props.ctx.ipc.invoke('get-channel-hint', { externalId: cid })) as any;
      if (!r?.ok || !r.data) return undefined;
      return {
        channelExternalId: cid,
        artists: (r.data.artists ?? []) as Array<{ id: number; displayName: string }>,
      };
    },
  );

  const canSubmit = () =>
    !submitting() &&
    work() !== null &&
    recording() !== null &&
    (recording()!.kind === 'existing' ||
      (recording()!.kind === 'new' && (recording() as any).artists.length > 0));

  async function submit() {
    if (!canSubmit()) return;
    setSubmitting(true);
    setError(null);
    const payload: RegisterVideoPayload = {
      videoId: props.videoId,
      work: work()!,
      recording: recording()!,
      isMainVideo: recording()!.kind === 'new' ? true : isMainVideo(),
    };
    const r = (await props.ctx.ipc.invoke('register', payload)) as any;
    setSubmitting(false);
    if (r?.ok) {
      props.onCommitted();
    } else {
      setError(r?.error?.message ?? 'Register failed');
    }
  }

  async function deleteVideo() {
    if (!confirm('이 영상을 DB에서 제거합니다. 연결된 recording/work/artist는 유지됩니다. 계속할까요?')) return;
    const rec = props.initialData?.recordings?.[0];
    const externalVideoId = props.initialData?.video?.id;
    if (!rec || externalVideoId == null) { setError('삭제에 필요한 ID 정보가 없습니다.'); return; }
    const r = (await props.ctx.ipc.invoke('delete-video', { videoId: props.videoId, recordingId: rec.id, externalVideoId })) as any;
    if (r?.ok) props.onCommitted();
    else setError(r?.error?.message ?? 'Delete failed');
  }

  const footer = (
    <>
      <button class="kanade-admin-btn" onClick={props.onClose}>취소</button>
      <button
        class="kanade-admin-btn kanade-admin-btn--primary"
        disabled={!canSubmit()}
        onClick={submit}
      >
        {submitting() ? '저장 중...' : (props.mode === 'create' ? '등록' : '저장')}
      </button>
    </>
  );

  return (
    <Drawer
      open={true}
      title={props.mode === 'create' ? '이 영상을 등록' : '이 영상 편집'}
      onClose={props.onClose}
      footer={footer}
    >
      <Show when={error()}>
        <div class="kanade-admin-banner kanade-admin-banner--error">{error()}</div>
      </Show>
      <WorkSection ctx={props.ctx} value={work()} onChange={setWork} />
      <Show when={work()}>
        <RecordingSection
          ctx={props.ctx}
          work={work()!}
          value={recording()}
          onChange={setRecording}
          channelHint={channelHint() ?? undefined}
        />
      </Show>
      <Show when={recording()}>
        <VideoLinkSection
          videoId={props.videoId}
          recording={recording()}
          isMainVideo={isMainVideo()}
          onChange={setIsMainVideo}
        />
      </Show>
      <Show when={props.mode === 'edit'}>
        <div class="kanade-admin-section" style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #3a3a3a;">
          <div class="kanade-admin-section__title" style="color: #ff8080;">⚠ 위험 영역</div>
          <button class="kanade-admin-btn kanade-admin-btn--danger" onClick={deleteVideo}>
            이 영상을 DB에서 제거
          </button>
        </div>
      </Show>
    </Drawer>
  );
}
