import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Modo `phone`: el celular entra por un solo origen (túnel HTTPS o red local) y este servidor reenvía /graphql y /voice
// al backend local, así no hay CORS ni hace falta exponer el puerto 4000. Ver README ("Probar en el celular").
const LOCAL_BACKEND = 'http://localhost:4000'
const phoneProxy = {
  '/graphql': LOCAL_BACKEND,
  '/voice': LOCAL_BACKEND,
  '/image-preview': LOCAL_BACKEND,
  '/progress': LOCAL_BACKEND,
  '/goals': LOCAL_BACKEND,
  '/analytics-key': LOCAL_BACKEND,
  '/enricher-key': LOCAL_BACKEND,
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/favicon-32.png', 'apple-touch-icon.png', 'favicon.ico'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Los íconos grandes solo se piden al instalar la app; no hace falta guardarlos para uso sin conexión
        globIgnores: ['icons/icon-512.png', 'icons/icon-maskable-512.png'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/delta-habits\.azurewebsites\.net\/graphql/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
      manifest: {
        name: 'Mnestics',
        short_name: 'Mnestics',
        description: 'Hilos de hábitos. Nodos de hallazgos.',
        theme_color: '#1A1535',
        background_color: '#05012A', // azul oscuro del ícono, para que la pantalla de arranque no desentone
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  ...(mode === 'phone' && { define: { 'import.meta.env.VITE_API_URL': JSON.stringify('') } }),
  server: {
    port: 3000,
    host: true,
    // Los túneles (cloudflared, ngrok…) llegan con su propio nombre de host
    allowedHosts: mode === 'phone' ? true : undefined,
    proxy: mode === 'phone' ? phoneProxy : undefined,
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: mode === 'phone' ? true : undefined,
    proxy: mode === 'phone' ? phoneProxy : undefined,
  },
}))
