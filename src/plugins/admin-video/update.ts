import type { AdminApiClient } from '../../admin/api-client.js';
import type { ApiResult, NewArtistInput, RegisterVideoPayload } from '../../admin/types.js';
import type { ArtistDiff } from './diff.js';
import { performRegister } from './register.js';

export interface UpdateVideoPayload {
  videoId: string;
  /** Artist-credit diffs to apply to the video's current (original) work. */
  workArtistDiff?: { workId: number; ops: ArtistDiff[] };
  /** Artist-credit diffs to apply to the video's current (original) recording. */
  recordingArtistDiff?: { recordingId: number; ops: ArtistDiff[] };
  /** Promote this video to the main of its recording. (Demotion isn't
   *  directly supported by the server — users instead promote another video.) */
  promoteMain?: { recordingId: number; externalVideoId: number };
}

export interface ReassignVideoPayload {
  videoId: string;
  /** Current (old) recording the video is linked to. Unlinked before re-linking. */
  oldRecordingId: number;
  oldExternalVideoId: number;
  /** Standard register payload for the target work/recording/isMain. */
  register: RegisterVideoPayload;
}

// The server identifies a {work,recording}_artist row by the composite
// (entityId, artistId, role). It reads role from `?role=` and falls back to
// null, so we must pass role explicitly on PUT/DELETE — otherwise non-null
// role rows never match and the update silently 404s.
function roleQs(role: string | null): string {
  return role === null ? '' : `?role=${encodeURIComponent(role)}`;
}

async function applyArtistDiff(
  client: AdminApiClient,
  kind: 'works' | 'recordings',
  id: number,
  ops: ArtistDiff[],
): Promise<ApiResult<null>> {
  for (const op of ops) {
    switch (op.op) {
      case 'add': {
        const r = await client.request('POST', `/admin/${kind}/${id}/artists`, {
          artistId: op.artistId,
          role: op.role,
          isPublic: op.isPublic,
        });
        if (!r.ok) return r;
        break;
      }
      case 'add-new': {
        const newRes = await client.request<{ id: number }>(
          'POST',
          '/admin/artists',
          op.newArtist as NewArtistInput,
        );
        if (!newRes.ok) return newRes;
        const r = await client.request('POST', `/admin/${kind}/${id}/artists`, {
          artistId: newRes.data.id,
          role: op.role,
          isPublic: op.isPublic,
        });
        if (!r.ok) return r;
        break;
      }
      case 'update': {
        const r = await client.request(
          'PUT',
          `/admin/${kind}/${id}/artists/${op.artistId}${roleQs(op.role)}`,
          { isPublic: op.isPublic },
        );
        if (!r.ok) return r;
        break;
      }
      case 'remove': {
        const r = await client.request(
          'DELETE',
          `/admin/${kind}/${id}/artists/${op.artistId}${roleQs(op.role)}`,
        );
        if (!r.ok) return r;
        break;
      }
    }
  }
  return { ok: true, data: null };
}

export async function performUpdate(
  client: AdminApiClient,
  payload: UpdateVideoPayload,
): Promise<ApiResult<null>> {
  if (payload.workArtistDiff && payload.workArtistDiff.ops.length > 0) {
    const r = await applyArtistDiff(
      client,
      'works',
      payload.workArtistDiff.workId,
      payload.workArtistDiff.ops,
    );
    if (!r.ok) return r;
  }
  if (payload.recordingArtistDiff && payload.recordingArtistDiff.ops.length > 0) {
    const r = await applyArtistDiff(
      client,
      'recordings',
      payload.recordingArtistDiff.recordingId,
      payload.recordingArtistDiff.ops,
    );
    if (!r.ok) return r;
  }
  if (payload.promoteMain) {
    const { recordingId, externalVideoId } = payload.promoteMain;
    const r = await client.request('POST', `/admin/recordings/${recordingId}/videos/${externalVideoId}/main`);
    if (!r.ok) return r;
  }
  return { ok: true, data: null };
}

/**
 * Reassigns a video to a different recording (and possibly a different work).
 * Composed as: unlink from the old recording → re-register under the new
 * work/recording via performRegister (which upserts the external_video row).
 * The old recording itself is preserved (may become orphaned if it had no
 * other videos — cleanup belongs in the web admin).
 */
export async function performReassign(
  client: AdminApiClient,
  payload: ReassignVideoPayload,
): Promise<ApiResult<{ recordingId: number }>> {
  const unlinkRes = await client.request(
    'DELETE',
    `/admin/recordings/${payload.oldRecordingId}/videos/${payload.oldExternalVideoId}`,
  );
  if (!unlinkRes.ok) return unlinkRes;
  return performRegister(client, payload.register);
}
