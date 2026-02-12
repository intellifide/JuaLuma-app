import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 2025-12-10 13:45 CST - restore vitest jsdom config
// 2025-12-10 13:45 CST - restore vitest jsdom config
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || env.VITE_API_BASE_URL || 'http://127.0.0.1:8001'

  return {
    plugins: [react()],
    envDir: '../',
    server: {
      port: 5175,
      host: true,
      allowedHosts: true, // Allow Cloud Run domain
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          xfwd: true,
        }
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  }
});
