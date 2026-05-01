import type { BackendContext } from '../../../types/plugins.js';

export async function setupSessionRoomMain(ctx: BackendContext): Promise<void> {
  console.log('[session-room] main plugin started');
  // Wiring (RealtimeClient, RoomController, IPC) added in PR2.
}
