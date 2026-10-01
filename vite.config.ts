/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vercel serves from the domain root. Set VITE_BASE (e.g. "/mindsten-prototype/")
// only when hosting under a sub-path.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'MindSTEN',
        short_name: 'MindSTEN',
        description: 'Peg på en gravsten og mød personen — og tiden, de levede i.',
        lang: 'da',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0F0E0D',
        theme_color: '#0F0E0D',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            // Map tiles: keep what the visitor has seen, for spotty signal at the cemetery.
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
          {
            urlPattern: /^https:\/\/commons\.wikimedia\.org\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'portraits', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts' },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
});
