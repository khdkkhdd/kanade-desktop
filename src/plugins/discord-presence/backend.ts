import type { BackendContext } from '../../types/plugins.js';
import { store, getPresenceConfig } from '../../config/store.js';
import { DiscordService } from './discord-service.js';
import { TimerManager } from './timer-manager.js';
import { PresenceController } from './presence-controller.js';
import type { PlayerStateUpdate, PresenceConfig } from './types.js';

let controller: PresenceController | null = null;
let discord: DiscordService | null = null;

export function setupBackend(ctx: BackendContext): void {
  const getApiBase = (): string => store.get('kanade').apiBase;
  const timerManager = new TimerManager();

  const initialConfig = getPresenceConfig();
  discord = new DiscordService(initialConfig);
  controller = new PresenceController(discord, timerManager, getApiBase, getPresenceConfig);

  if (initialConfig.enabled) discord.connect();

  ctx.ipc.on('update-player-state', (...args: unknown[]) => {
    const snapshot = args[0] as PlayerStateUpdate;
    void controller?.onPlayerStateUpdate(snapshot);
  });

  ctx.ipc.on('clear-player', () => {
    controller?.onClearPlayer();
  });

  // Renderer forwards the cross-plugin `admin-video:data-changed` broadcast
  // here so we can drop the cached resolution and re-fetch fresh DB data.
  ctx.ipc.on('invalidate-presence', (...args: unknown[]) => {
    const payload = args[0] as { videoId?: string } | undefined;
    if (payload?.videoId) controller?.invalidate(payload.videoId);
  });
}

/**
 * Called directly from `src/index.ts` when settings are saved.
 * The global `settings:changed` event is a Main→Renderer broadcast, so Main
 * itself can't receive it via `ipcMain.on` — hence this exported helper is
 * invoked directly from index.ts instead.
 */
export function applyPresenceConfigChange(newPresence: PresenceConfig | undefined): void {
  if (!discord || !newPresence) return;
  discord.applyConfig(newPresence);
  const wasConnected = discord.isConnectedAndReady();
  if (newPresence.enabled && !wasConnected) discord.connect();
  else if (!newPresence.enabled && wasConnected) discord.disconnect();
}

export function stopBackend(): void {
  discord?.disconnect();
  discord = null;
  controller = null;
}
