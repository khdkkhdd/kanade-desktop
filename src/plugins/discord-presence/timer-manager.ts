import { TimerKey } from './constants.js';

/**
 * Central manager for keyed timers. Setting a new timer for the same key
 * clears the previous one automatically.
 * Adapted from pear-desktop (MIT) — see NOTICE.
 */
export class TimerManager {
  private timers = new Map<TimerKey, NodeJS.Timeout>();

  set(key: TimerKey, callback: () => void, delayMs: number): void {
    this.clear(key);
    const handle = setTimeout(() => {
      this.timers.delete(key);
      callback();
    }, delayMs);
    this.timers.set(key, handle);
  }

  clear(key: TimerKey): void {
    const handle = this.timers.get(key);
    if (handle !== undefined) {
      clearTimeout(handle);
      this.timers.delete(key);
    }
  }

  clearAll(): void {
    for (const handle of this.timers.values()) clearTimeout(handle);
    this.timers.clear();
  }

  has(key: TimerKey): boolean {
    return this.timers.has(key);
  }
}
