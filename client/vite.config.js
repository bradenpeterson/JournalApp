import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // Proxy registration API calls, but do NOT proxy plain /registration
      // so SPA routes like /registration/sign_up render the React component.
      '/api/registration': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api-auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    manifest: true,
    rollupOptions: {
      input: "./src/main.jsx"
    },
    outDir: "../_server/core/static/core"
  },
  base: process.env.NODE_ENV === 'production' ? "/static" : "/"
})
