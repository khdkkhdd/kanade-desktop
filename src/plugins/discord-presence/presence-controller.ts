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
 * YouTube Mix 에서 다음 큐 아이템의 metadata 를 선제적으로 DOM/player API 에 반영하는
 * 시간이 있어서, videoChanged 직후의 snapshot 은 stale / 엇갈린 title 을 담고
 * 있는 경우가 많다. 1.5s 정도 기다리면 player 가 settle 되고 snapshot 이
 * 현재 영상의 진짜 metadata 를 담게 된다.
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
    const song = mergeSongInfo(resolved, snapshot);
    this.dispatchUpdate(song, true);
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
  // title/artists always come from the resolved cache. During Mix transitions
  // YouTube updates DOM/player title preemptively to next queue items, so
  // re-reading from snapshot would cause flicker — we trust the one-shot
  // delayed resolve instead.
  return {
    title: resolved.title,
    artists: resolved.artists,
    originUrl: resolved.originUrl,
    thumbnailUrl: resolved.thumbnailUrl,
    videoUrl: resolved.videoUrl,
    videoId: snapshot.videoId,
    isPaused: snapshot.paused,
    elapsedSeconds: snapshot.currentTime,
    durationSeconds: snapshot.duration,
    isFallback: resolved.kind === 'fallback',
  };
}
