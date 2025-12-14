import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Needed for docker
    proxy: {
      '/api': {
        target: 'http://backend:8001',
        changeOrigin: true,
      },
    },
  },
})
