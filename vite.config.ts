import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { offlineShell } from './build/offlineShell.ts';

export default defineConfig({
  base: './',
  plugins: [react(), offlineShell()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
  build: { rollupOptions: { output: { manualChunks: (id: string) => {
    if (id.includes('elkjs')) return 'elk';
    if (id.includes('@xyflow') || id.includes('/d3-') || id.includes('/zustand/')) return 'graph';
    if (id.includes('node_modules/dexie/')) return 'storage';
    if (id.includes('node_modules/zod/')) return 'validation';
  } } } },
});
