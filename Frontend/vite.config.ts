import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { writeFileSync, mkdirSync } from 'fs'

// Versão do app - timestamp único a cada build
const APP_VERSION = Date.now().toString()
const BUILD_TIME = new Date().toISOString()

// Detectar se está em desenvolvimento
const isDev = process.env.NODE_ENV !== 'production'

// Plugin para gerar version.json a cada build
const versionPlugin = () => ({
  name: 'version-plugin',
  closeBundle() {
    if (!isDev) {
      const versionInfo = {
        version: APP_VERSION,
        buildTime: BUILD_TIME,
        hash: Math.random().toString(36).substring(2, 15),
      }
      try {
        mkdirSync('./build', { recursive: true })
        writeFileSync('./build/version.json', JSON.stringify(versionInfo))
        console.log(`\n✅ version.json gerado: v${APP_VERSION}`)
      } catch (e) {
        console.error('Erro ao gerar version.json:', e)
      }
    }
  },
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    versionPlugin(),
    VitePWA({
      registerType: 'autoUpdate', // ✅ MUDANÇA: Auto-atualiza sem prompt
      devOptions: {
        enabled: false, // ✅ Desabilitado em dev para evitar erros - PWA só em produção
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'WOLK NOW® - Smart & Secure Wallet',
        short_name: 'WOLK NOW',
        description: 'Carteira Inteligente P2P com IA Preditiva e Sistema de Reputação',
        theme_color: '#7c3aed',
        background_color: '#1e3a8a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/?v=' + APP_VERSION, // ✅ Versão na URL para forçar atualização
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['finance', 'productivity'],
        lang: 'pt-BR',
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Acessar dashboard principal',
            url: '/dashboard',
            icons: [{ src: '/shortcuts/dashboard.png', sizes: '96x96' }],
          },
          {
            name: 'P2P Trading',
            short_name: 'P2P',
            description: 'Acessar mercado P2P',
            url: '/p2p',
            icons: [{ src: '/shortcuts/p2p.png', sizes: '96x96' }],
          },
          {
            name: 'Carteiras',
            short_name: 'Wallet',
            description: 'Gerenciar carteiras',
            url: '/wallet',
            icons: [{ src: '/shortcuts/wallet.png', sizes: '96x96' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // ✅ Força atualização imediata
        sourcemap: false,
        // ✅ NOVO: Ignorar URLs externas (localhost:8000, APIs de produção, etc)
        navigateFallbackDenylist: [/^\/api/, /^http/],
        runtimeCaching: [
          {
            // HTML - sempre buscar da rede primeiro
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-v3',
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 30, // 30 minutos
              },
              networkTimeoutSeconds: 3, // Timeout rápido
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // JS/CSS - rede primeiro, cache como fallback
            urlPattern: ({ request }) =>
              request.destination === 'script' || request.destination === 'style',
            handler: 'StaleWhileRevalidate', // ✅ Usa cache, mas atualiza em background
            options: {
              cacheName: 'static-resources-v3',
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24, // 24 horas
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Imagens - cache first (raramente mudam)
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-v3',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // ✅ CORRIGIDO: Cachear apenas APIs relativas (não URLs absolutas)
            urlPattern: ({ url }) => {
              const isRelativeApi = url.pathname.startsWith('/api/')
              const isSameOrigin = url.origin === self.location.origin
              return isRelativeApi && isSameOrigin
            },
            handler: 'NetworkOnly', // ✅ APIs sempre da rede
            options: {
              cacheName: 'api-cache-v3',
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@services': resolve(__dirname, './src/services'),
      '@stores': resolve(__dirname, './src/stores'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@config': resolve(__dirname, './src/config'),
      '@locales': resolve(__dirname, './src/locales'),
      '@styles': resolve(__dirname, './src/styles'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          crypto: ['web3', 'ethers', 'bip39', 'crypto-js'],
          ui: ['framer-motion', '@radix-ui/react-dialog'],
          i18n: ['i18next', 'react-i18next'],
          websocket: ['socket.io-client'],
        },
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@tanstack/react-query',
      'react-hook-form',
      'zod',
      'i18next',
      'react-i18next',
    ],
  },
  define: {
    global: 'globalThis',
    // Versão do app disponível em runtime
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
  },
})
