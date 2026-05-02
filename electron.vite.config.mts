import { defineConfig } from 'electron-vite';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';

// Load .env.local into process.env for build-time `define` substitutions.
// Node 20.6+ provides loadEnvFile; missing file is silent.
try { process.loadEnvFile?.('.env.local'); } catch { /* no .env.local — fine */ }

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: 'src/index.ts',
        external: ['electron', 'electron-store'],
      },
      outDir: 'dist/main',
    },
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL ?? ''),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY ?? ''),
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
