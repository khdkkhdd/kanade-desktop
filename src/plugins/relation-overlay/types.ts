// --- API Response Types ---

export interface VideoRef {
  platform: string;
  externalId: string;
}

export interface ArtistRef {
  id: number;
  name: string;
  originalName: string;
  type: string;
  role?: string;
}

export interface RecordingRelation {
  id: number;
  type: string;
  // Field name `song` preserved to match the server's /video response wire shape
  // (server preserves old field names even after the 3-layer rename for PR 1).
  song: RecordingItem;
}

export interface RecordingItem {
  id: number;
  title: string;
  originalTitle: string;
  isCover: boolean;
  artists: ArtistRef[];
  videos: VideoRef[];
}

export interface VideoResponse {
  // Field names `songs` / `songGroup` preserved to match the server's /video
  // response wire shape (unchanged by PR 1).
  songs: Array<
    RecordingItem & {
      songGroup: { id: number; title: string; originalTitle: string };
      relations: RecordingRelation[];
    }
  >;
}

export interface ArtistRelationsResponse {
  artist: { id: number; name: string; originalName: string; type: string } | null;
  from: Array<{ id: number; type: string; artist: ArtistRef }>;
  to: Array<{ id: number; type: string; artist: ArtistRef }>;
}

export interface RecordingListResponse {
  data: RecordingItem[];
  nextOffset: number | null;
}

// --- IPC Channel Types ---

export interface FetchVideoRequest {
  videoId: string;
  lang: string;
}

export interface FetchWorkRequest {
  workId: number;
  lang: string;
  offset: number;
  limit: number;
}

export interface FetchArtistRelationsRequest {
  artistId: number;
  lang: string;
}

export interface FetchArtistRecordingsRequest {
  artistId: number;
  lang: string;
  offset: number;
  limit: number;
}
