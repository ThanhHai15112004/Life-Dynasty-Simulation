import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Đường tắt tuyệt đối, dùng chung cho Vite (trình duyệt), Vitest và tsx (Node headless)
const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': fromRoot('./src/core'),
      '@content': fromRoot('./src/content'),
      '@game': fromRoot('./src/game'),
      '@ui': fromRoot('./src/ui'),
      '@bridge': fromRoot('./src/bridge'),
      '@shared': fromRoot('./src/shared'),
    },
  },
  build: {
    // Phaser vốn nặng (~1,4 MB): tách riêng để trình duyệt cache lâu dài
    chunkSizeWarningLimit: 1600,
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'], react: ['react', 'react-dom'] } } },
  },
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
  },
});
