/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vercel serves from the domain root. Set VITE_BASE (e.g. "/mindsten-prototype/")
// only when hosting under a sub-path.
const base = process.env.VITE_BASE ?? '/';

// Absolute URL for share previews (og:image). Vercel provides the production domain at build time.
const siteUrl = (
  process.env.VITE_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : '')
).replace(/\/+$/, '');

export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: 'mindsten-site-url',
      transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
    },
    VitePWA({
      registerType: 'autoUpdate',
      // Registered from src/lib/pwa.ts (update checks + safe reloads).
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: base,
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
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
        categories: ['education', 'travel', 'books'],
        // Long-press the home-screen icon.
        shortcuts: [
          {
            name: 'Scan en gravsten',
            short_name: 'Scan',
            url: `${base}scanner`,
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          { name: 'Kort over grave', short_name: 'Kort', url: `${base}map` },
          { name: 'Søg efter en person', short_name: 'Søg', url: `${base}search` },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        // Fonts: precache only the basic latin subsets (covers Danish); others load on demand.
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*-latin-opsz-*.woff2'],
        // Share image and large launcher icons are never needed offline.
        globIgnores: ['**/og-image.png', '**/icon-512.png', '**/icon-maskable-512.png'],
        runtimeCaching: [
          {
            // Archive data the visitor has seen stays readable with poor signal at the cemetery.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.hostname.endsWith('.supabase.co') &&
              url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'archive',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Map tiles: keep what the visitor has seen (never prefetch — OSM tile policy).
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 60 * 60 * 24 * 7,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Portraits (Wikimedia Commons redirects to upload.wikimedia.org).
            urlPattern: /^https:\/\/(commons|upload)\.wikimedia\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'portraits',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
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
