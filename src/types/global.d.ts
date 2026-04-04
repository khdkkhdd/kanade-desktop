export {};

declare global {
  interface Window {
    kanade: {
      version: string;
      ipc: {
        send: (channel: string, ...args: unknown[]) => void;
        invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
        on: (channel: string, listener: (...args: unknown[]) => void) => void;
      };
    };
  }
}
