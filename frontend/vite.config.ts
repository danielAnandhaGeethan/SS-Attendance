import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxies same-origin "/api/*" calls to the local FastAPI backend so
    // the browser never makes a cross-origin request in dev - the backend
    // has no CORS headers configured, so a direct browser->backend call
    // would otherwise be blocked outright.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
})
