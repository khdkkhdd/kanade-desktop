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

export class PresenceController {
  private currentVideoId: string | null = null;
  private cache = new Map<string, ResolvedSongInfo>();
  private lastSongInfo: SongInfo | null = null;
  private lastProgressUpdate = 0;

  constructor(
    private discord: DiscordService,
    private timerManager: TimerManager,
    private getApiBase: () => string,
    private getConfig: () => PresenceConfig,
  ) {}

  async onPlayerStateUpdate(snapshot: PlayerStateUpdate): Promise<void> {
    const newVideoId = snapshot.videoId;
    const videoChanged = newVideoId !== this.currentVideoId;

    if (videoChanged) {
      this.currentVideoId = newVideoId;
      let resolved = this.cache.get(newVideoId);
      if (!resolved) {
        resolved = await resolveSongInfo(snapshot, this.getApiBase());
        this.addToCache(newVideoId, resolved);
      }
    }

    const resolved = this.cache.get(newVideoId);
    if (!resolved) return;

    const song = mergeSongInfo(resolved, snapshot);
    this.dispatchUpdate(song, videoChanged);
  }

  onClearPlayer(): void {
    this.currentVideoId = null;
    this.lastSongInfo = null;
    this.timerManager.clear(TimerKey.ClearActivity);
    this.discord.clearActivity();
  }

  private dispatchUpdate(song: SongInfo, videoChanged: boolean): void {
    const prev = this.lastSongInfo;
    const pauseChanged = prev !== null && prev.isPaused !== song.isPaused;
    const seeked =
      prev !== null &&
      !videoChanged &&
      isSeek(prev.elapsedSeconds, song.elapsedSeconds);

    const trigger = videoChanged || pauseChanged || seeked;
    const now = Date.now();

    if (trigger || now - this.lastProgressUpdate > PROGRESS_THROTTLE_MS) {
      this.discord.setActivity(buildActivity(song));
      this.lastSongInfo = song;
      this.lastProgressUpdate = now;
      this.schedulePauseTimeout(song);
    } else {
      // Within throttle window, still remember latest state
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
  // For fallback kind, the cached title/artists may have come from a stale DOM
  // snapshot (YouTube SPA updates document.title AFTER yt-navigate-finish, so
  // the first dispatch for a new video often captured the PREVIOUS video's
  // title). Re-derive from the current snapshot on every merge so subsequent
  // timeupdate/play events correct the display. DB kind is authoritative — we
  // keep the resolved title/artists regardless of DOM state.
  const isFallback = resolved.kind === 'fallback';
  const title = isFallback ? (snapshot.domTitle || 'YouTube') : resolved.title;
  const artists = isFallback
    ? (snapshot.domChannel || 'YouTube')
    : resolved.artists;
  return {
    title,
    artists,
    originUrl: resolved.originUrl,
    thumbnailUrl: resolved.thumbnailUrl,
    videoUrl: resolved.videoUrl,
    videoId: snapshot.videoId,
    isPaused: snapshot.paused,
    elapsedSeconds: snapshot.currentTime,
    durationSeconds: snapshot.duration,
    isFallback,
  };
}
