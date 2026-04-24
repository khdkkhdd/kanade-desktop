import type { AdminApiClient } from '../../admin/api-client.js';
import type { RegisterVideoPayload, ApiResult, ArtistCreditInput, NewArtistInput } from '../../admin/types.js';

interface RegisterOutcome {
  recordingId: number;
}

type NewArtistCredit = {
  newArtist: NewArtistInput;
  role: string | null;
  isPublic: boolean;
  tempId?: string;
};
type WorkOrRecordingCredit = ArtistCreditInput | NewArtistCredit;

/**
 * Resolve a credit to `{ artistId, role, isPublic }`, creating the artist
 * when needed. A `tempId` tagged credit shares the same DB artist across
 * every caller in the current submit — so picking the same locally-created
 * artist in work AND recording collapses to a single POST /admin/artists.
 */
type ResolvedCreditResult =
  | { ok: true; credit: ArtistCreditInput }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

async function resolveCredit(
  client: AdminApiClient,
  credit: WorkOrRecordingCredit,
  tempIdMap: Map<string, number>,
): Promise<ResolvedCreditResult> {
  if (!('newArtist' in credit)) {
    return { ok: true, credit };
  }
  const { tempId } = credit;
  if (tempId !== undefined) {
    const cached = tempIdMap.get(tempId);
    if (cached !== undefined) {
      return { ok: true, credit: { artistId: cached, role: credit.role, isPublic: credit.isPublic } };
    }
  }
  const newRes = await client.request<{ id: number }>('POST', '/admin/artists', credit.newArtist);
  if (!newRes.ok) return newRes;
  if (tempId !== undefined) tempIdMap.set(tempId, newRes.data.id);
  return { ok: true, credit: { artistId: newRes.data.id, role: credit.role, isPublic: credit.isPublic } };
}

export async function performRegister(
  client: AdminApiClient,
  payload: RegisterVideoPayload,
): Promise<ApiResult<RegisterOutcome>> {
  // Shared across both sections so a locally-created artist reused across
  // work and recording is created exactly once.
  const tempIdMap = new Map<string, number>();

  let workId: number;
  if (payload.work.kind === 'existing') {
    workId = payload.work.id;
  } else {
    const resolvedWorkArtists: ArtistCreditInput[] = [];
    for (const a of payload.work.artists) {
      const res = await resolveCredit(client, a, tempIdMap);
      if (!res.ok) return res;
      resolvedWorkArtists.push(res.credit);
    }
    const r = await client.request<{ id: number }>('POST', '/admin/works', {
      titles: payload.work.titles,
    });
    if (!r.ok) return r;
    workId = r.data.id;
    for (const a of resolvedWorkArtists) {
      const rr = await client.request('POST', `/admin/works/${workId}/artists`, a);
      if (!rr.ok) return rr;
    }
  }

  let recordingId: number;
  if (payload.recording.kind === 'existing') {
    recordingId = payload.recording.id;
    const r = await client.request('POST', `/admin/recordings/${recordingId}/videos`, {
      platform: 'youtube',
      externalId: payload.videoId,
      isMain: payload.isMainVideo,
    });
    if (!r.ok) return r;
  } else {
    const resolvedArtists: ArtistCreditInput[] = [];
    for (const a of payload.recording.artists) {
      const res = await resolveCredit(client, a, tempIdMap);
      if (!res.ok) return res;
      resolvedArtists.push(res.credit);
    }
    const r = await client.request<{ id: number }>('POST', '/admin/recordings', {
      workId,
      isOrigin: payload.recording.isOrigin,
      titles: payload.recording.titles,
      artists: resolvedArtists,
      videos: [{ platform: 'youtube', externalId: payload.videoId, isMain: payload.isMainVideo }],
    });
    if (!r.ok) return r;
    recordingId = r.data.id;
  }

  return { ok: true, data: { recordingId } };
}
