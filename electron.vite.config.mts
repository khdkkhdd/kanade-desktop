import { defineConfig } from 'electron-vite';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';

const solidPlugin = solid({ extensions: ['.tsx', '.jsx'] });

export default defineConfig({
  main: {
    plugins: [solidPlugin],
    build: {
      rollupOptions: {
        input: 'src/index.ts',
        external: ['electron', 'electron-store'],
      },
      outDir: 'dist/main',
    },
  },
  preload: {
    plugins: [solidPlugin],
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
    plugins: [solidPlugin],
    root: 'src',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/index.html'),
          settings: resolve(__dirname, 'src/settings-window/index.html'),
        },
      },
      outDir: 'dist/renderer',
    },
  },
});
