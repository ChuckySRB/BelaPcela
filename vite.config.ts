import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
  build: { rollupOptions: { output: { manualChunks: (id: string) => {
    if (id.includes('elkjs')) return 'elk';
    if (id.includes('node_modules/dexie/')) return 'storage';
    if (id.includes('node_modules/zod/')) return 'validation';
  } } } },
});
