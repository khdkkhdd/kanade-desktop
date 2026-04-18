// Wire shape types mirroring kanade-server's /api/v1/public responses.
// Source of truth: docs/superpowers/specs/2026-04-18-phase4-3layer-schema-design.md §4.

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
  artistId: number;
  name: string;
  role: string | null;
  isPublic: boolean;
}

// ─── /videos/:platform/:externalId ───────────────────────

export interface WorkSummary {
  id: number;
  titles: TitleEntry[];
  creators: ArtistCredit[];
}

export interface VideoRecording {
  id: number;
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

// ─── Recording list item (shared: /works/:id/recordings, /artists/:id/recordings) ───

export interface RecordingListItem {
  id: number;
  isOrigin: boolean;
  title: string;
  workTitle: string;
  artists: ArtistCredit[];
  workCreators: ArtistCredit[];
  mainVideo: VideoRef | null;
}

export interface RecordingListResponse {
  data: RecordingListItem[];
  seed: number;
  nextOffset: number | null;
}

// ─── /recordings/:id/videos ──────────────────────────────

export interface RecordingVideo {
  platform: string;
  externalId: string;
  isMain: boolean;
}

// ─── /artists/:id/relations ──────────────────────────────

export interface ArtistRelation {
  type: string;
  direction: 'outgoing' | 'incoming';
  artist: { id: number; name: string; type: string };
}

// ─── IPC Request shapes ──────────────────────────────────

export interface FetchVideoRequest {
  videoId: string;
  lang: string;
}

export interface FetchWorkRecordingsRequest {
  workId: number;
  lang: string;
  isOrigin?: boolean;
  exclude?: number;
  seed?: number;
  offset: number;
  limit: number;
}

export interface FetchRecordingVideosRequest {
  recordingId: number;
}

export interface FetchArtistRecordingsRequest {
  artistId: number;
  lang: string;
  seed?: number;
  offset: number;
  limit: number;
}

export interface FetchArtistRelationsRequest {
  artistId: number;
  lang: string;
}
