// Wire shape types mirroring kanade-server's /api/v1/public responses.
// Source of truth: docs/superpowers/specs/2026-04-18-phase4-3layer-schema-design.md §4.
//
// Public identifiers are opaque nanoid strings — the server never exposes its
// internal BigInt PKs. Field naming:
//   - `publicId` for the entity itself
//   - `artistPublicId` / `workPublicId` for references in nested contexts

// ─── Primitives ──────────────────────────────────────────

export interface VideoRef {
  platform: string;
  externalId: string;
}

export interface TitleEntry {
  language: string;
  title: string;
  isMain: boolean;
}

export interface ArtistCredit {
  artistPublicId: string;
  name: string;
  originalName: string;
  role: string | null;
  isPublic: boolean;
}

// ─── /videos/:platform/:externalId ───────────────────────

export interface WorkSummary {
  publicId: string;
  titles: TitleEntry[];
  creators: ArtistCredit[];
}

export interface VideoRecording {
  publicId: string;
  isOrigin: boolean;
  titles: TitleEntry[];
  artists: ArtistCredit[];
  work: WorkSummary;
  isMainVideo: boolean;
}

export interface VideoResponse {
  video: VideoRef;
  recordings: VideoRecording[];
}

// ─── Recording list item (shared: /works/:publicId/recordings, /artists/:publicId/recordings) ───

export interface RecordingListItem {
  publicId: string;
  isOrigin: boolean;
  title: string;
  originalTitle: string;
  workTitle: string;
  workOriginalTitle: string;
  workPublicId: string;
  artists: ArtistCredit[];
  workCreators: ArtistCredit[];
  mainVideo: VideoRef | null;
}

export interface RecordingListResponse {
  data: RecordingListItem[];
  seed: number;
  nextOffset: number | null;
}

// ─── /recordings/:publicId/videos ────────────────────────

export interface RecordingVideo {
  platform: string;
  externalId: string;
  isMain: boolean;
}

// ─── /artists/:publicId/relations ────────────────────────

export interface ArtistRelation {
  type: string;
  direction: 'outgoing' | 'incoming';
  artist: { publicId: string; name: string; originalName: string; type: string };
}

// ─── IPC Request shapes ──────────────────────────────────

export interface FetchVideoRequest {
  videoId: string;
  lang: string;
}

export interface FetchWorkRecordingsRequest {
  workPublicId: string;
  lang: string;
  isOrigin?: boolean;
  excludePublicId?: string;
  seed?: number;
  offset: number;
  limit: number;
}

export interface FetchRecordingVideosRequest {
  recordingPublicId: string;
}

export interface FetchArtistRecordingsRequest {
  artistPublicId: string;
  lang: string;
  seed?: number;
  offset: number;
  limit: number;
}

export interface FetchArtistRelationsRequest {
  artistPublicId: string;
  lang: string;
}
