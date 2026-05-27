import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { createRequire } from 'module';
const { version } = createRequire(import.meta.url)('./package.json');

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Skip waiting so the new SW activates immediately without needing
        // the user to close all tabs.
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Power Plan',
        short_name: 'PowerPlan',
        description: 'From idea to live app — powered by AI',
        theme_color: '#7c3aed',
        background_color: '#0a0a0f',
        display: 'standalone',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', ws: true, changeOrigin: true },
    },
  },
});
