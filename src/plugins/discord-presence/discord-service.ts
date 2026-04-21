import { Client as DiscordClient } from '@xhayper/discord-rpc';
import type { SetActivity } from '@xhayper/discord-rpc/dist/structures/ClientUser';
import { clientId, RECONNECT_BACKOFF_MS, TimerKey } from './constants.js';
import { TimerManager } from './timer-manager.js';
import type { PresenceConfig } from './types.js';

/**
 * Manages the Discord RPC client lifecycle.
 * Adapted from pear-desktop (MIT) — see NOTICE.
 */
export class DiscordService {
  private rpc!: DiscordClient;
  private ready = false;
  private autoReconnect: boolean;
  private timerManager = new TimerManager();

  private lastActivity: SetActivity | null = null;

  constructor(config: PresenceConfig) {
    this.autoReconnect = config.autoReconnect;
    this.initializeRpc();
  }

  private initializeRpc(): void {
    if (this.rpc) {
      try { this.rpc.destroy(); } catch { /* ignored */ }
      this.rpc.removeAllListeners();
    }
    this.rpc = new DiscordClient({ clientId });

    this.rpc.on('connected', () => {
      console.log('[discord-presence] connected');
    });

    this.rpc.on('ready', () => {
      this.ready = true;
      console.log('[discord-presence] ready');
      if (this.lastActivity) {
        void this.rpc.user?.setActivity(this.lastActivity).catch((err) => {
          console.error('[discord-presence] re-apply activity failed:', err);
        });
      }
    });

    this.rpc.on('disconnected', () => {
      this.ready = false;
      console.log('[discord-presence] disconnected');
      if (this.autoReconnect) this.scheduleReconnect();
    });
  }

  connect(): void {
    if (this.rpc.isConnected) return;
    if (clientId.startsWith('0000')) {
      console.warn('[discord-presence] clientId is placeholder — skipping connect (register Discord app first)');
      return;
    }
    this.timerManager.clear(TimerKey.DiscordConnectRetry);
    this.rpc.login().catch((err) => {
      console.warn('[discord-presence] login failed:', err?.message ?? err);
      this.ready = false;
      if (this.autoReconnect) {
        this.initializeRpc();
        this.scheduleReconnect();
      }
    });
  }

  disconnect(): void {
    this.timerManager.clearAll();
    try {
      // Best-effort clear presence in Discord before tearing down the socket.
      if (this.rpc.isConnected && this.ready) {
        void this.rpc.user?.clearActivity().catch(() => { /* ignored */ });
      }
      this.rpc.removeAllListeners();
      this.rpc.destroy();
    } catch { /* ignored */ }
    this.ready = false;
    this.lastActivity = null;
    // Recreate client so next connect() call starts fresh.
    this.initializeRpc();
  }

  private scheduleReconnect(): void {
    if (!this.autoReconnect) return;
    this.timerManager.set(
      TimerKey.DiscordConnectRetry,
      () => {
        if (!this.autoReconnect || this.rpc.isConnected) return;
        this.rpc.login().catch(() => {
          this.initializeRpc();
          this.scheduleReconnect();
        });
      },
      RECONNECT_BACKOFF_MS,
    );
  }

  setActivity(activity: SetActivity): void {
    this.lastActivity = activity;
    if (!this.rpc.isConnected || !this.ready) return;
    this.rpc.user?.setActivity(activity).catch((err) => {
      console.error('[discord-presence] setActivity failed:', err);
    });
  }

  clearActivity(): void {
    this.lastActivity = null;
    if (!this.rpc.isConnected || !this.ready) return;
    this.rpc.user?.clearActivity().catch((err) => {
      console.error('[discord-presence] clearActivity failed:', err);
    });
  }

  isConnectedAndReady(): boolean {
    return this.rpc.isConnected && this.ready;
  }

  applyConfig(newConfig: PresenceConfig): void {
    this.autoReconnect = newConfig.autoReconnect;
  }
}
