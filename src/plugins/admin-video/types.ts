// Shape of the admin video lookup response
// (kanade-server: usecases/admin/video/getVideoForAdmin). Bilingual display
// fields (displayName/originalName, displayTitle/originalTitle) are resolved
// server-side so the drawer can render both primaries without another pass.

export interface AdminVideoTitle {
  language: string;
  title: string;
  isMain: boolean;
}

export interface AdminVideoArtist {
  artistId: number;
  displayName: string;
  originalName: string;
  role: string | null;
  isPublic: boolean;
}

export interface AdminVideoRecording {
  id: number;
  isOrigin: boolean;
  isMainVideo: boolean;
  displayTitle: string;
  originalTitle: string;
  titles: AdminVideoTitle[];
  artists: AdminVideoArtist[];
  work: {
    id: number;
    displayTitle: string;
    originalTitle: string;
    titles: AdminVideoTitle[];
    creators: AdminVideoArtist[];
  };
}

export interface AdminVideoData {
  video: {
    id: number;
    platform: string;
    externalId: string;
  };
  recordings: AdminVideoRecording[];
}
