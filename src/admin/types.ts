// Mirror of kanade-server admin API wire shapes.
// See: docs/superpowers/specs/2026-04-19-pr3-1-admin-desktop-design.md §6

import type { SupportedLanguage } from './lang-detect.js';

// ─── Input shapes ─────────────────────────────────────────

export interface TitleInput {
  title: string;
  language: string;
  isMain: boolean;
}

export interface ArtistNameInput {
  name: string;
  language: string;
  isMain: boolean;
}

export interface ArtistCreditInput {
  artistId: number;
  role: string | null;
  isPublic: boolean;
}

export interface NewArtistInput {
  type: 'solo' | 'group';
  names: ArtistNameInput[];
}

// ─── Search result shapes ─────────────────────────────────

export interface WorkSearchResult {
  id: number;
  displayTitle: string;
}

export interface RecordingSearchResult {
  id: number;
  displayTitle: string;
  isOrigin: boolean;
}

export interface ArtistSearchResult {
  id: number;
  displayName: string;
  type: 'solo' | 'group';
}

// ─── Registration payload (renderer → main) ───────────────

export type WorkSelection =
  | { kind: 'existing'; id: number }
  | { kind: 'new'; titles: TitleInput[]; artists: ArtistCreditInput[] };

export type RecordingSelection =
  | { kind: 'existing'; id: number }
  | {
      kind: 'new';
      isOrigin: boolean;
      titles: TitleInput[];
      artists: Array<ArtistCreditInput | { newArtist: NewArtistInput; role: string | null; isPublic: boolean }>;
    };

export interface RegisterVideoPayload {
  videoId: string;
  work: WorkSelection;
  recording: RecordingSelection;
  isMainVideo: boolean;
}

// ─── Settings ─────────────────────────────────────────────

export interface AdminSettings {
  adminApiKey: string;
  apiBase: string;
}

// ─── API result envelope ──────────────────────────────────

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

export type { SupportedLanguage } from './lang-detect.js';
