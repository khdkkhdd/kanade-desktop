import { defineConfig } from 'electron-vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: 'src/index.ts',
      },
      outDir: 'dist/main',
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: 'src/preload.ts',
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
