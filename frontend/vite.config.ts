import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 2025-12-10 13:45 CST - restore vitest jsdom config
export default defineConfig({
  plugins: [react()],
  envDir: '../',
  server: {
    port: 5175,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});