import { defineConfig } from 'electron-vite';
import solid from 'vite-plugin-solid';

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
    build: {
      lib: {
        entry: 'src/preload.ts',
        formats: ['cjs'],
      },
      rollupOptions: {
        external: ['electron'],
      },
      outDir: 'dist/preload',
    },
  },
  renderer: {
    root: 'src',
    build: {
      rollupOptions: {
        input: 'src/index.html',
      },
      outDir: 'dist/renderer',
    },
    plugins: [
      solid({
        extensions: ['.tsx', '.jsx'],
      }),
    ],
  },
});
