import { PROGRESS_THROTTLE_MS, TimerKey } from './constants.js';
import { buildActivity } from './activity-builder.js';
import { resolveSongInfo } from './song-info-resolver.js';
import { isSeek } from './utils.js';
import type { DiscordService } from './discord-service.js';
import type { TimerManager } from './timer-manager.js';
import type {
  PlayerStateUpdate,
  PresenceConfig,
  ResolvedSongInfo,
  SongInfo,
} from './types.js';

const MAX_CACHE = 50;

/**
 * In a YouTube Mix, the DOM/player API sometimes pre-populates the next queued
 * item's metadata, so the snapshot captured right after videoChanged often
 * holds stale / mismatched titles. Waiting ~1.5s lets the player settle, so
 * the snapshot then reflects the actually-playing video's real metadata.
 */
const RESOLVE_SETTLE_DELAY_MS = 1500;

export class PresenceController {
  private currentVideoId: string | null = null;
  private cache = new Map<string, ResolvedSongInfo>();
  private lastSongInfo: SongInfo | null = null;
  private lastProgressUpdate = 0;
  private lastSnapshot: PlayerStateUpdate | null = null;
  private pendingResolveTimer: NodeJS.Timeout | null = null;

  constructor(
    private discord: DiscordService,
    private timerManager: TimerManager,
    private getApiBase: () => string,
    private getConfig: () => PresenceConfig,
  ) {}

  async onPlayerStateUpdate(snapshot: PlayerStateUpdate): Promise<void> {
    const newVideoId = snapshot.videoId;
    const videoChanged = newVideoId !== this.currentVideoId;
    this.lastSnapshot = snapshot;

    if (videoChanged) {
      this.currentVideoId = newVideoId;
      if (this.pendingResolveTimer) clearTimeout(this.pendingResolveTimer);
      if (this.cache.has(newVideoId)) {
        const cached = this.cache.get(newVideoId)!;
        const song = mergeSongInfo(cached, snapshot);
        this.dispatchUpdate(song, true);
      } else {
        this.pendingResolveTimer = setTimeout(() => {
          void this.resolvePending(newVideoId);
        }, RESOLVE_SETTLE_DELAY_MS);
      }
      return;
    }

    // Same videoId — progress / pause / seek updates.
    const resolved = this.cache.get(newVideoId);
    if (!resolved) return; // still waiting for initial resolve

    const song = mergeSongInfo(resolved, snapshot);
    this.dispatchUpdate(song, false);
  }

  onClearPlayer(): void {
    this.currentVideoId = null;
    this.lastSongInfo = null;
    this.lastSnapshot = null;
    if (this.pendingResolveTimer) {
      clearTimeout(this.pendingResolveTimer);
      this.pendingResolveTimer = null;
    }
    this.timerManager.clear(TimerKey.ClearActivity);
    this.discord.clearActivity();
  }

  private async resolvePending(videoId: string): Promise<void> {
    this.pendingResolveTimer = null;
    if (videoId !== this.currentVideoId) return;
    const snapshot = this.lastSnapshot;
    if (!snapshot) return;

    const cfg = this.getConfig();
    const resolved = await resolveSongInfo(snapshot, this.getApiBase(), cfg.titleLanguage);
    if (videoId !== this.currentVideoId) return;

    this.addToCache(videoId, resolved);
    // Use the freshest snapshot in case a newer dispatch arrived during fetch.
    const merged = this.lastSnapshot ?? snapshot;
    const song = mergeSongInfo(resolved, merged);
    this.dispatchUpdate(song, true);
  }

  private dispatchUpdate(song: SongInfo, videoChanged: boolean): void {
    const prev = this.lastSongInfo;
    const pauseChanged = prev !== null && prev.isPaused !== song.isPaused;
    const seeked =
      prev !== null &&
      !videoChanged &&
      isSeek(prev.elapsedSeconds, song.elapsedSeconds);
    // Fallback titles refresh from live DOM — push immediately when they change
    // instead of waiting out the 15s progress throttle.
    const metaChanged =
      prev !== null &&
      !videoChanged &&
      (prev.title !== song.title || prev.artists !== song.artists);

    const trigger = videoChanged || pauseChanged || seeked || metaChanged;
    const now = Date.now();

    if (trigger || now - this.lastProgressUpdate > PROGRESS_THROTTLE_MS) {
      this.discord.setActivity(buildActivity(song));
      this.lastSongInfo = song;
      this.lastProgressUpdate = now;
      this.schedulePauseTimeout(song);
    } else {
      this.lastSongInfo = song;
    }
  }

  private schedulePauseTimeout(song: SongInfo): void {
    this.timerManager.clear(TimerKey.ClearActivity);
    const cfg = this.getConfig();
    if (!song.isPaused || cfg.activityTimeoutMinutes <= 0) return;
    this.timerManager.set(
      TimerKey.ClearActivity,
      () => {
        this.discord.clearActivity();
      },
      cfg.activityTimeoutMinutes * 60 * 1000,
    );
  }

  private addToCache(videoId: string, info: ResolvedSongInfo): void {
    if (this.cache.size >= MAX_CACHE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(videoId, info);
  }
}

function mergeSongInfo(
  resolved: ResolvedSongInfo,
  snapshot: PlayerStateUpdate,
): SongInfo {
  // DB result keeps the server-resolved title/artists. Fallback has DOM as its
  // only source, so we keep re-deriving from the freshest snapshot — otherwise
  // a stale domTitle captured during a Mix transition gets cached forever and
  // never recovers even after the player settles.
  const isFallback = resolved.kind === 'fallback';
  return {
    title: isFallback ? (snapshot.domTitle || 'YouTube') : resolved.title,
    artists: isFallback ? (snapshot.domChannel || 'YouTube') : resolved.artists,
    originUrl: resolved.originUrl,
    thumbnailUrl: resolved.thumbnailUrl,
    videoUrl: resolved.videoUrl,
    videoId: snapshot.videoId,
    isPaused: snapshot.paused,
    elapsedSeconds: snapshot.currentTime,
    durationSeconds: snapshot.duration,
    isLive: snapshot.isLive,
    isFallback,
  };
}
