import { describe, it, expect, beforeEach, vi } from 'vitest';

// electron-store transitively imports `electron`, which is unavailable in a
// vitest (node) environment. Mock electron-store with a tiny in-memory store
// that mirrors the methods this module uses (`get`, `set`).
vi.mock('electron-store', () => {
  class FakeStore<T extends Record<string, unknown>> {
    #data: Record<string, unknown>;
    constructor(options: { defaults: T }) {
      this.#data = structuredClone(options.defaults) as Record<string, unknown>;
    }
    get(key: string): unknown {
      return this.#data[key];
    }
    set(key: string, value: unknown): void {
      this.#data[key] = value;
    }
  }
  return { default: FakeStore };
});

const { store, getLocaleSetting } = await import('./store.js');

describe('store kanade.locale', () => {
  beforeEach(() => {
    const k = store.get('kanade');
    store.set('kanade', { ...k, locale: null });
  });

  it('defaults to null when never set', () => {
    expect(getLocaleSetting()).toBeNull();
  });

  it('persists user choice', () => {
    const k = store.get('kanade');
    store.set('kanade', { ...k, locale: 'ko' });
    expect(getLocaleSetting()).toBe('ko');
  });

  it('round-trips null after a value', () => {
    const k = store.get('kanade');
    store.set('kanade', { ...k, locale: 'ja' });
    expect(getLocaleSetting()).toBe('ja');
    store.set('kanade', { ...k, locale: null });
    expect(getLocaleSetting()).toBeNull();
  });
});
