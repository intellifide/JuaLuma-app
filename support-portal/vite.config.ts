import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Needed for docker
    // Cloud Run hits the service via *.run.app hostnames. Allowing all hosts
    // avoids Vite's default host check (DNS rebinding protection) from blocking.
    // This is acceptable here because we're using the Vite server as a simple
    // static preview server behind Cloud Run.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://backend:8001',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
})
