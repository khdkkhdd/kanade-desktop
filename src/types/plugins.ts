export interface PluginConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export interface BackendContext {
  ipc: {
    send: (event: string, ...args: unknown[]) => void;
    handle: (event: string, listener: (...args: unknown[]) => unknown) => void;
    on: (event: string, listener: (...args: unknown[]) => void) => void;
  };
  window: Electron.BrowserWindow;
}

export interface RendererContext {
  ipc: {
    send: (event: string, ...args: unknown[]) => void;
    invoke: (event: string, ...args: unknown[]) => Promise<unknown>;
    on: (event: string, listener: (...args: unknown[]) => void) => void;
  };
}

export interface PluginDef<
  BackendProps = unknown,
  RendererProps = unknown,
  Config extends PluginConfig = PluginConfig,
> {
  name: () => string;
  description?: () => string;
  restartNeeded?: boolean;
  config?: Config;

  backend?:
    | ((ctx: BackendContext) => void | Promise<void>)
    | ({ start?: (ctx: BackendContext) => void | Promise<void>; stop?: () => void | Promise<void> } & BackendProps);

  renderer?:
    | ((ctx: RendererContext) => void | Promise<void>)
    | ({ start?: (ctx: RendererContext) => void | Promise<void>; stop?: () => void | Promise<void> } & RendererProps);
}
