import { TimerKey } from './constants.js';

/**
 * 키로 구분되는 타이머들을 중앙 관리. 같은 키에 중복 set 시 이전 타이머 clear.
 * Ported from ~/repo/pear-desktop/src/plugins/discord/timer-manager.ts.
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
