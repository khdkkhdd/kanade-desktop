import { defineConfig } from 'electron-vite';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: 'src/index.ts',
        external: ['electron', 'electron-store'],
      },
      outDir: 'dist/main',
    },
  },
  preload: {
    plugins: [solid({ extensions: ['.tsx', '.jsx'] })],
    build: {
      lib: {
        entry: {
          preload: 'src/preload.ts',
          'settings-preload': 'src/settings-window/preload.ts',
        },
        formats: ['cjs'],
      },
      rollupOptions: {
        external: ['electron'],
      },
      outDir: 'dist/preload',
    },
  },
  renderer: {
    plugins: [solid({ extensions: ['.tsx', '.jsx'] })],
    root: 'src',
    build: {
      rollupOptions: {
        input: {
          settings: resolve(__dirname, 'src/settings-window/index.html'),
        },
      },
      outDir: 'dist/renderer',
    },
  },
});
