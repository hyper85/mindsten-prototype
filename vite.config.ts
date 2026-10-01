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
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'MindSTEN',
        short_name: 'MindSTEN',
        description: 'Peg på en gravsten og mød personen — og tiden, de levede i.',
        lang: 'da',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5f3ee',
        theme_color: '#f5f3ee',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        // Fonts: precache only the latin subsets (Danish); others load on demand.
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*-latin-*.woff2'],
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
