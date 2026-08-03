import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Base is parameterized so the SAME source can build for GitHub Pages (default)
// or, later, a Firebase Hosting path — matching welder / plating / freight.
const BASE = process.env.APP_BASE || '/billing-slip/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    // Added 2026-08-04: this app had NO service worker, so every open was a full
    // network download of the whole bundle (measured 337 ms for the JS alone, on
    // top of a 780 ms first paint). With the SW, repeat opens are served from the
    // device and the app survives a dropped connection.
    VitePWA({
      registerType: 'autoUpdate',
      scope: BASE,
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      workbox: {
        navigateFallback: `${BASE}index.html`,
        navigateFallbackAllowlist: [new RegExp('^' + BASE)],
        // Never let the SW serve the app for Firebase's reserved /__/auth/* paths —
        // doing so boots the app inside the auth iframe → recursion → white screen.
        navigateFallbackDenylist: [/^\/__/],
      },
      manifest: {
        name: 'UNICO Billing Slip',
        short_name: 'Billing Slip',
        description: 'Quick billing slips',
        theme_color: '#1e293b',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
