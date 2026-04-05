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

export interface SongRelation {
  id: number;
  type: string;
  song: SongItem;
}

export interface SongItem {
  id: number;
  title: string;
  originalTitle: string;
  isCover: boolean;
  artists: ArtistRef[];
  videos: VideoRef[];
}

export interface VideoResponse {
  songs: Array<
    SongItem & {
      songGroup: { id: number; title: string; originalTitle: string };
      relations: SongRelation[];
    }
  >;
}

export interface ArtistRelationsResponse {
  artist: { id: number; name: string; originalName: string; type: string } | null;
  from: Array<{ id: number; type: string; artist: ArtistRef }>;
  to: Array<{ id: number; type: string; artist: ArtistRef }>;
}

export interface SongListResponse {
  data: SongItem[];
  nextOffset: number | null;
}

// --- IPC Channel Types ---

export interface FetchVideoRequest {
  videoId: string;
  lang: string;
}

export interface FetchSongGroupRequest {
  songGroupId: number;
  lang: string;
  offset: number;
  limit: number;
}

export interface FetchArtistRelationsRequest {
  artistId: number;
  lang: string;
}

export interface FetchArtistSongsRequest {
  artistId: number;
  lang: string;
  offset: number;
  limit: number;
}
