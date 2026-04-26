import { batch, createSignal, createResource, createEffect, onCleanup, Show } from 'solid-js';
import type { RendererContext } from '../../../types/plugins.js';
import type { WorkSelection, RecordingSelection, RegisterVideoPayload, ArtistCreditInput, NewArtistInput } from '../../../admin/types.js';
import { Drawer } from '../../../admin/components/Drawer.js';
import { WorkSection } from './WorkSection.js';
import { RecordingSection } from './RecordingSection.js';
import { VideoLinkSection } from './VideoLinkSection.js';
import type { ArtistCreditInitial } from './ArtistCreditsSection.js';
import { computeArtistDiff, type ArtistCreditSnapshot } from '../diff.js';
import type { UpdateVideoPayload, ReassignVideoPayload } from '../update.js';
import type { AdminVideoArtist, AdminVideoData } from '../types.js';
import { readBridgedChannelId } from '../channel-bridge.js';
import { findOwnerChannelUc } from '../../../lib/youtube-dom/owner-channels.js';

type Credit = ArtistCreditInput | { newArtist: NewArtistInput; role: string | null; isPublic: boolean };

export interface DraftData {
  work: WorkSelection | null;
  recording: RecordingSelection | null;
  isMainVideo: boolean;
  workArtistsAfter: Credit[];
  recordingArtistsAfter: Credit[];
}

export interface VideoDrawerProps {
  videoId: string;
  mode: 'create' | 'edit';
  initialData: AdminVideoData | null;
  ctx: RendererContext;
  onClose: () => void;
  onCommitted: () => void;
  /** Previously-saved in-progress state for this video (same session). */
  initialDraft?: DraftData | null;
  /** Fires on every state mutation; caller persists the latest draft. */
  onDraftChange?: (draft: DraftData) => void;
  /** Fires when the user clicks "Start over" to discard the draft. */
  onDraftDiscard?: () => void;
}

function pickDisplayTitle(titles: Array<{ language: string; title: string; isMain: boolean }> | undefined, fallback: string): string {
  if (!titles || titles.length === 0) return fallback;
  const main = titles.find((t) => t.isMain) ?? titles[0];
  return main?.title || fallback;
}

/** Bilingual labels sent through to EntityPicker so selected Work/Recording
 *  renders ko-preferred primary + dim original when they differ. */
function pickBilingualLabels(
  titles: Array<{ language: string; title: string; isMain: boolean }> | undefined,
  fallback: string,
): { primary: string; original?: string } {
  if (!titles || titles.length === 0) return { primary: fallback };
  const main = titles.find((t) => t.isMain) ?? titles[0];
  const original = main?.title || fallback;
  const ko = titles.find((t) => t.language === 'ko')?.title;
  return { primary: ko ?? original, original: ko ? original : undefined };
}

export function VideoDrawer(props: VideoDrawerProps) {
  // In edit mode the current mapping is pre-selected so the user sees the
  // existing Work / Recording and can jump straight to the danger zone or
  // reassign. We only handle the first recording of the video for now — a
  // video with multiple recordings is rare and detailed per-recording edit
  // lives in the web admin.
  const editSeed = props.mode === 'edit' ? props.initialData?.recordings?.[0] : null;
  const draft = props.initialDraft ?? null;

  const [work, setWork] = createSignal<WorkSelection | null>(
    draft
      ? draft.work
      : editSeed ? { kind: 'existing', id: editSeed.work.id } : null,
  );
  const [recording, setRecording] = createSignal<RecordingSelection | null>(
    draft
      ? draft.recording
      : editSeed ? { kind: 'existing', id: editSeed.id } : null,
  );
  const [isMainVideo, setIsMainVideo] = createSignal(
    draft
      ? draft.isMainVideo
      : editSeed ? !!editSeed.isMainVideo : true,
  );
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  // Edit-mode only: mirrors the server's is_public flag so toggling updates
  // the UI immediately. New videos created through the drawer default to
  // true server-side; no need to surface the toggle in create mode.
  const [isPublic, setIsPublic] = createSignal<boolean>(
    props.mode === 'edit' ? props.initialData?.video?.isPublic !== false : true,
  );
  const [publicBusy, setPublicBusy] = createSignal(false);
  // Toggled off→on by resetForm() so child sections remount and re-read
  // their initial state from the (now-reset) parent props.
  const [mounted, setMounted] = createSignal(true);

  // Edit-mode artist editing snapshots + current state.
  const workArtistsBefore: ArtistCreditSnapshot[] = editSeed
    ? (editSeed.work.creators ?? []).map((c: AdminVideoArtist) => ({
        artistId: c.artistId,
        role: c.role ?? null,
        isPublic: !!c.isPublic,
      }))
    : [];
  const workArtistsInitial: ArtistCreditInitial[] = editSeed
    ? (editSeed.work.creators ?? []).map((c: AdminVideoArtist) => ({
        artistId: c.artistId,
        displayName: c.displayName,
        originalName: c.originalName,
        role: c.role ?? null,
        isPublic: !!c.isPublic,
      }))
    : [];
  const recordingArtistsBefore: ArtistCreditSnapshot[] = editSeed
    ? (editSeed.artists ?? []).map((c: AdminVideoArtist) => ({
        artistId: c.artistId,
        role: c.role ?? null,
        isPublic: !!c.isPublic,
      }))
    : [];
  const recordingArtistsInitial: ArtistCreditInitial[] = editSeed
    ? (editSeed.artists ?? []).map((c: AdminVideoArtist) => ({
        artistId: c.artistId,
        displayName: c.displayName,
        originalName: c.originalName,
        role: c.role ?? null,
        isPublic: !!c.isPublic,
      }))
    : [];

  const [workArtistsAfter, setWorkArtistsAfter] = createSignal<Credit[]>(
    draft?.workArtistsAfter
      ?? workArtistsBefore.map((c) => ({ artistId: c.artistId, role: c.role, isPublic: c.isPublic })),
  );
  const [recordingArtistsAfter, setRecordingArtistsAfter] = createSignal<Credit[]>(
    draft?.recordingArtistsAfter
      ?? recordingArtistsBefore.map((c) => ({ artistId: c.artistId, role: c.role, isPublic: c.isPublic })),
  );

  // When the user reassigns to a different work, clear the recording selection.
  // Without this reset, recording() keeps pointing at the OLD recording (which
  // belongs to the OLD work); submit then goes down the reassign path but ends
  // up re-linking the video to the same old recording — a silent no-op.
  let prevWorkKey: string | undefined;
  createEffect(() => {
    const w = work();
    const key = w ? (w.kind === 'existing' ? `e:${w.id}` : 'new') : 'null';
    if (prevWorkKey === undefined) {
      prevWorkKey = key;
      return;
    }
    if (prevWorkKey !== key) {
      prevWorkKey = key;
      setRecording(null);
    }
  });

  // Auto-save draft on any state change so reopen restores in-progress work.
  // Skip the first render pass — on mount the signals merely echo the server
  // data (or an existing draft), so there's nothing worth persisting yet and
  // we'd otherwise create a synthetic draft for a drawer the user never
  // touched.
  let draftInitialized = false;
  createEffect(() => {
    // Read every dependency before the guard so Solid tracks them on future runs.
    const snapshot = {
      work: work(),
      recording: recording(),
      isMainVideo: isMainVideo(),
      workArtistsAfter: workArtistsAfter(),
      recordingArtistsAfter: recordingArtistsAfter(),
    };
    if (!draftInitialized) {
      draftInitialized = true;
      return;
    }
    props.onDraftChange?.(snapshot);
  });

  // In edit mode, the ArtistCreditsSection reflects the CURRENT (draft-aware)
  // artist state, not the untouched server data. We enrich each credit with
  // a displayName when we know it (from editSeed); unknown ids (e.g. user
  // added them in a previous session) fall back to "Artist #id" in the UI.
  const workArtistsInfoMap: Record<number, { displayName?: string; originalName?: string } | undefined> =
    Object.fromEntries(
      workArtistsInitial.flatMap((e) =>
        'artistId' in e ? [[e.artistId, { displayName: e.displayName, originalName: e.originalName }]] : [],
      ),
    );
  const recordingArtistsInfoMap: Record<number, { displayName?: string; originalName?: string } | undefined> =
    Object.fromEntries(
      recordingArtistsInitial.flatMap((e) =>
        'artistId' in e ? [[e.artistId, { displayName: e.displayName, originalName: e.originalName }]] : [],
      ),
    );
  const workArtistsForDisplay = (): ArtistCreditInitial[] =>
    workArtistsAfter().map((c) => {
      if ('newArtist' in c) return c;
      const info = workArtistsInfoMap[c.artistId];
      return {
        artistId: c.artistId,
        displayName: info?.displayName,
        originalName: info?.originalName,
        role: c.role,
        isPublic: c.isPublic,
      };
    });
  const recordingArtistsForDisplay = (): ArtistCreditInitial[] =>
    recordingArtistsAfter().map((c) => {
      if ('newArtist' in c) return c;
      const info = recordingArtistsInfoMap[c.artistId];
      return {
        artistId: c.artistId,
        displayName: info?.displayName,
        originalName: info?.originalName,
        role: c.role,
        isPublic: c.isPublic,
      };
    });

  // Prefer server-computed bilingual fields (from admin endpoint). These
  // already apply the recording→work title fallback, which the raw titles
  // array doesn't — so picking from editSeed.titles alone loses the
  // original label whenever a recording inherits its work's titles.
  const initialWorkLabel = editSeed
    ? (editSeed.work.displayTitle ?? pickDisplayTitle(editSeed.work.titles, `Work #${editSeed.work.id}`))
    : undefined;
  const initialWorkOriginalLabel = editSeed
    ? (editSeed.work.originalTitle ?? pickBilingualLabels(editSeed.work.titles, '').original)
    : undefined;
  const initialRecordingLabel = editSeed
    ? (editSeed.displayTitle
        ?? pickDisplayTitle(editSeed.titles, initialWorkLabel ?? `Recording #${editSeed.id}`))
    : undefined;
  const initialRecordingOriginalLabel = editSeed
    ? (editSeed.originalTitle
        ?? pickBilingualLabels(editSeed.titles, '').original
        ?? initialWorkOriginalLabel)
    : undefined;

  // Resolve the uploader's UC channel id. Owner anchor hrefs come first
  // because they survive SPA navigation reliably; fall back to the main-world
  // bridge (videoDetails.channelId) and finally the legacy <meta> tag.
  const channelExternalId = (): string => {
    const fromOwner = findOwnerChannelUc();
    if (fromOwner) return fromOwner;

    const bridged = readBridgedChannelId();
    if (bridged) return bridged;

    const meta = document.querySelector('meta[itemprop="channelId"]') as HTMLMetaElement | null;
    if (meta?.content && /^UC[\w-]{22}$/.test(meta.content)) return meta.content;

    return '';
  };

  // Poll for up to 5s while the owner chip / bridge dataset is still mounting.
  const [cid, setCid] = createSignal(channelExternalId());
  if (!cid()) {
    const interval = setInterval(() => {
      const v = channelExternalId();
      if (v) {
        setCid(v);
        clearInterval(interval);
      }
    }, 200);
    const timeout = setTimeout(() => clearInterval(interval), 5000);
    onCleanup(() => {
      clearInterval(interval);
      clearTimeout(timeout);
    });
  }

  const [channelHint] = createResource(cid, async (c) => {
    if (!c) return undefined;
    const r = (await props.ctx.ipc.invoke('get-channel-hint', { externalId: c })) as any;
    if (!r?.ok || !r.data) return undefined;
    const rawArtists = (r.data.artists ?? []) as Array<{ artistId: number; displayName: string }>;
    return {
      artists: rawArtists.map((a) => ({ id: a.artistId, displayName: a.displayName })),
    };
  });

  // A new work needs at least one title (and exactly one flagged isMain) —
  // without this guard the server rejects the create with "Exactly one title
  // must be isMain=true" and the user sees a raw backend error.
  const newWorkHasMainTitle = () => {
    const w = work();
    if (!w || w.kind !== 'new') return true;
    if (w.titles.length === 0) return false;
    return w.titles.filter((t) => t.isMain).length === 1;
  };

  const canSubmit = () =>
    !submitting() &&
    work() !== null &&
    newWorkHasMainTitle() &&
    recording() !== null &&
    (recording()!.kind === 'existing' ||
      (recording()!.kind === 'new' && (recording() as any).artists.length > 0));

  // Edit-mode: did the user keep the original work/recording (so artist edits apply)?
  const workUntouched = () =>
    editSeed && work()?.kind === 'existing' && (work() as { id: number }).id === editSeed.work.id;
  const recordingUntouched = () =>
    editSeed && recording()?.kind === 'existing' && (recording() as { id: number }).id === editSeed.id;

  // Has the user changed anything from the fresh initial state? Drives the
  // "Reset" button's visibility.
  const hasChanges = () => {
    if (props.mode === 'create') {
      return (
        work() !== null ||
        recording() !== null ||
        workArtistsAfter().length > 0 ||
        recordingArtistsAfter().length > 0
      );
    }
    if (!editSeed) return false;
    const w = work();
    const r = recording();
    if (!w || w.kind !== 'existing' || w.id !== editSeed.work.id) return true;
    if (!r || r.kind !== 'existing' || r.id !== editSeed.id) return true;
    if (isMainVideo() !== !!editSeed.isMainVideo) return true;
    if (computeArtistDiff(workArtistsBefore, workArtistsAfter()).length > 0) return true;
    if (computeArtistDiff(recordingArtistsBefore, recordingArtistsAfter()).length > 0) return true;
    return false;
  };

  async function submitCreate() {
    const payload: RegisterVideoPayload = {
      videoId: props.videoId,
      work: work()!,
      recording: recording()!,
      isMainVideo: recording()!.kind === 'new' ? true : isMainVideo(),
    };
    return (await props.ctx.ipc.invoke('register', payload)) as any;
  }

  async function submitEdit() {
    // submitEdit only runs in edit mode, so editSeed is guaranteed to exist —
    // but TS can't narrow a closure-captured const, so we re-check here.
    if (!editSeed) return { ok: false, error: { code: 'MISSING', message: 'editSeed missing' } };
    const externalVideoId = props.initialData?.video?.id;

    // Path A: user reassigned to a different work and/or recording. Unlink
    // the video from the original recording and re-link via the register flow.
    if (!recordingUntouched() || !workUntouched()) {
      if (externalVideoId == null) {
        return { ok: false, error: { code: 'MISSING', message: 'externalVideoId unknown' } };
      }
      const payload: ReassignVideoPayload = {
        videoId: props.videoId,
        oldRecordingId: editSeed.id,
        oldExternalVideoId: externalVideoId,
        register: {
          videoId: props.videoId,
          work: work()!,
          recording: recording()!,
          isMainVideo: recording()!.kind === 'new' ? true : isMainVideo(),
        },
      };
      return (await props.ctx.ipc.invoke('reassign', payload)) as any;
    }

    // Path B: in-place edit. Artist diffs + optional promote-to-main.
    const update: UpdateVideoPayload = { videoId: props.videoId };
    const workOps = computeArtistDiff(workArtistsBefore, workArtistsAfter());
    if (workOps.length > 0) update.workArtistDiff = { workId: editSeed.work.id, ops: workOps };
    const recOps = computeArtistDiff(recordingArtistsBefore, recordingArtistsAfter());
    if (recOps.length > 0) update.recordingArtistDiff = { recordingId: editSeed.id, ops: recOps };
    if (!editSeed.isMainVideo && isMainVideo() && externalVideoId != null) {
      update.promoteMain = { recordingId: editSeed.id, externalVideoId };
    }

    // Nothing to update — treat as success.
    if (!update.workArtistDiff && !update.recordingArtistDiff && !update.promoteMain) {
      return { ok: true, data: null };
    }
    return (await props.ctx.ipc.invoke('update', update)) as any;
  }

  async function submit() {
    if (!canSubmit()) return;
    setSubmitting(true);
    setError(null);
    const r = props.mode === 'create' ? await submitCreate() : await submitEdit();
    setSubmitting(false);
    if (r?.ok) {
      props.onCommitted();
    } else {
      setError(r?.error?.message ?? (props.mode === 'create' ? 'Register failed' : 'Update failed'));
    }
  }

  function resetForm() {
    const seedWork: WorkSelection | null = editSeed
      ? { kind: 'existing', id: editSeed.work.id }
      : null;
    const seedRecording: RecordingSelection | null = editSeed
      ? { kind: 'existing', id: editSeed.id }
      : null;
    // Pre-seed prevWorkKey so the work→recording-clear effect treats the
    // programmatic reset as a no-op and doesn't overwrite seedRecording.
    prevWorkKey = seedWork ? `e:${seedWork.id}` : 'null';
    batch(() => {
      setWork(seedWork);
      setRecording(seedRecording);
      setIsMainVideo(editSeed ? !!editSeed.isMainVideo : true);
      setWorkArtistsAfter(
        workArtistsBefore.map((c) => ({ artistId: c.artistId, role: c.role, isPublic: c.isPublic })),
      );
      setRecordingArtistsAfter(
        recordingArtistsBefore.map((c) => ({ artistId: c.artistId, role: c.role, isPublic: c.isPublic })),
      );
      setError(null);
    });
    props.onDraftDiscard?.();
    // Remount children so their uncontrolled local state (EntityPicker query,
    // create-mode flags, inline title inputs) re-initializes from reset props.
    setMounted(false);
    queueMicrotask(() => setMounted(true));
  }

  async function togglePublic() {
    if (publicBusy()) return;
    const next = !isPublic();
    setPublicBusy(true);
    setError(null);
    const r = (await props.ctx.ipc.invoke('set-video-public', {
      videoId: props.videoId,
      isPublic: next,
    })) as any;
    setPublicBusy(false);
    if (r?.ok) setIsPublic(next);
    else setError(r?.error?.message ?? '공개 상태 변경 실패');
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
      <Show when={hasChanges()}>
        <button
          class="kanade-admin-btn"
          style="margin-right: auto;"
          onClick={resetForm}
        >
          초기화
        </button>
      </Show>
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
      <Show when={mounted()}>
        <WorkSection
          ctx={props.ctx}
          value={work()}
          onChange={setWork}
          channelHint={channelHint() ?? undefined}
          initialLabel={initialWorkLabel}
          initialOriginalLabel={initialWorkOriginalLabel}
          originalWorkId={editSeed ? editSeed.work.id : undefined}
          originalArtists={workArtistsForDisplay()}
          onExistingArtistsChange={props.mode === 'edit' ? setWorkArtistsAfter : undefined}
        />
        <Show when={work()}>
          <RecordingSection
            ctx={props.ctx}
            work={work()!}
            value={recording()}
            onChange={setRecording}
            channelHint={channelHint() ?? undefined}
            initialLabel={initialRecordingLabel}
            initialOriginalLabel={initialRecordingOriginalLabel}
            originalRecordingId={editSeed ? editSeed.id : undefined}
            originalArtists={recordingArtistsForDisplay()}
            onExistingArtistsChange={props.mode === 'edit' ? setRecordingArtistsAfter : undefined}
          />
        </Show>
        <Show when={recording()}>
          <VideoLinkSection
            videoId={props.videoId}
            recording={recording()}
            isMainVideo={isMainVideo()}
            onChange={setIsMainVideo}
            lockedAsMain={props.mode === 'edit' && !!editSeed?.isMainVideo}
          />
        </Show>
        <Show when={props.mode === 'edit'}>
          <div class="kanade-admin-section">
            <div class="kanade-admin-section__title">공개 상태</div>
            <div class="kanade-admin-meta">
              {isPublic()
                ? '현재 공개 리스트에 노출됩니다.'
                : '비공개 — 공개 리스트와 메인 영상 후보에서 제외됩니다.'}
            </div>
            <button
              class="kanade-admin-btn"
              disabled={publicBusy()}
              onClick={togglePublic}
            >
              {publicBusy()
                ? '변경 중...'
                : isPublic() ? '비공개로 표시' : '공개로 복원'}
            </button>
          </div>
          <div class="kanade-admin-section kanade-admin-section--danger">
            <div class="kanade-admin-section__title">위험 영역</div>
            <button class="kanade-admin-btn kanade-admin-btn--danger" onClick={deleteVideo}>
              이 영상을 DB에서 제거
            </button>
          </div>
        </Show>
      </Show>
    </Drawer>
  );
}
