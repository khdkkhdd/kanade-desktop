import type { AdminApiClient } from '../../admin/api-client.js';
import type { RegisterVideoPayload, ApiResult, ArtistCreditInput, NewArtistInput } from '../../admin/types.js';

interface RegisterOutcome {
  recordingId: number;
}

export async function performRegister(
  client: AdminApiClient,
  payload: RegisterVideoPayload,
): Promise<ApiResult<RegisterOutcome>> {
  let workId: number;
  if (payload.work.kind === 'existing') {
    workId = payload.work.id;
  } else {
    const r = await client.request<{ id: number }>('POST', '/admin/works', {
      titles: payload.work.titles,
    });
    if (!r.ok) return r;
    workId = r.data.id;
    for (const a of payload.work.artists) {
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
      if ('newArtist' in a) {
        const newRes = await client.request<{ id: number }>('POST', '/admin/artists', a.newArtist as NewArtistInput);
        if (!newRes.ok) return newRes;
        resolvedArtists.push({ artistId: newRes.data.id, role: a.role, isPublic: a.isPublic });
      } else {
        resolvedArtists.push(a);
      }
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
