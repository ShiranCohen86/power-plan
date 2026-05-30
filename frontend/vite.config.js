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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core — changes rarely, cache-friendly
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Redux stack
          if (id.includes('node_modules/@reduxjs/') || id.includes('node_modules/react-redux/') || id.includes('node_modules/redux/')) {
            return 'vendor-redux';
          }
          // Router
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run/')) {
            return 'vendor-router';
          }
          // i18n
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'vendor-i18n';
          }
          // MUI — large, changes with design-system upgrades
          if (id.includes('node_modules/@mui/')) {
            return 'vendor-mui';
          }
          // socket.io — loaded dynamically, but chunk still benefits from naming
          if (id.includes('node_modules/socket.io-client') || id.includes('node_modules/engine.io-client')) {
            return 'vendor-socket';
          }
          // Axios + networking utils
          if (id.includes('node_modules/axios')) {
            return 'vendor-http';
          }
        },
      },
    },
  },
});
