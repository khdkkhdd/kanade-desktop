import type { BackendContext } from '../../types/plugins.js';
import { store } from '../../config/store.js';
import { DiscordService } from './discord-service.js';
import { TimerManager } from './timer-manager.js';
import { PresenceController } from './presence-controller.js';
import type { PlayerStateUpdate, PresenceConfig } from './types.js';

let controller: PresenceController | null = null;
let discord: DiscordService | null = null;

const DEFAULT_PRESENCE_CONFIG: PresenceConfig = {
  enabled: false,
  autoReconnect: true,
  activityTimeoutMinutes: 10,
};

function readPresenceConfig(): PresenceConfig {
  // store schema hasn't been extended yet (T13 will do that). Safe fallback.
  const k = store.get('kanade') as { presence?: PresenceConfig };
  return k.presence ?? DEFAULT_PRESENCE_CONFIG;
}

export function setupBackend(ctx: BackendContext): void {
  const getApiBase = (): string => store.get('kanade').apiBase;
  const timerManager = new TimerManager();

  const initialConfig = readPresenceConfig();
  discord = new DiscordService(initialConfig);
  controller = new PresenceController(discord, timerManager, getApiBase, readPresenceConfig);

  if (initialConfig.enabled) discord.connect();

  ctx.ipc.on('update-player-state', (...args: unknown[]) => {
    const snapshot = args[0] as PlayerStateUpdate;
    void controller?.onPlayerStateUpdate(snapshot);
  });

  ctx.ipc.on('clear-player', () => {
    controller?.onClearPlayer();
  });
}

/**
 * Settings save 시 `src/index.ts` 가 직접 호출.
 * 전역 `settings:changed` 는 Main→Renderer 브로드캐스트라 Main에서 ipcMain.on 으로 수신 불가 —
 * 따라서 exported 함수를 index.ts 에서 직접 호출하는 패턴 채택.
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
