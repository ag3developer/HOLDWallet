import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { writeFileSync, mkdirSync, readFileSync } from 'fs'

// Ler versão do package.json (versão semântica fixa)
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const APP_VERSION = packageJson.version // Ex: "1.0.0" - muda apenas manualmente
const BUILD_TIME = new Date().toISOString()
const BUILD_HASH = Date.now().toString(36) // Hash único do build (para debug, não para update check)

// Detectar se está em desenvolvimento
const isDev = process.env.NODE_ENV !== 'production'

// Plugin para gerar version.json a cada build
const versionPlugin = () => ({
  name: 'version-plugin',
  closeBundle() {
    if (!isDev) {
      const versionInfo = {
        version: APP_VERSION, // Versão semântica fixa do package.json
        buildTime: BUILD_TIME,
        buildHash: BUILD_HASH, // Para debug, não afeta update check
      }
      try {
        mkdirSync('./build', { recursive: true })
        writeFileSync('./build/version.json', JSON.stringify(versionInfo))
        console.log(`\n✅ version.json gerado: v${APP_VERSION} (build: ${BUILD_HASH})`)
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
        enabled: true, // ✅ Habilitado em dev para testar Push Notifications
        type: 'module',
      },
      includeAssets: ['favicon.ico', 'images/logos/wn-icon.png'],
      manifest: {
        name: 'WOLK NOW® - Smart & Secure Wallet',
        short_name: 'WOLK NOW',
        description: 'Carteira Inteligente P2P com IA Preditiva e Sistema de Reputação',
        theme_color: '#1e3a8a',
        background_color: '#1e3a8a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        id: 'wolknow-pwa',
        prefer_related_applications: false,
        icons: [
          {
            src: '/images/logos/wn-icon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/images/logos/wn-icon.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/images/logos/wn-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/images/logos/wn-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
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
        // ✅ Importar SW de Push Notifications
        importScripts: ['/sw-push.js'],
        // ✅ Ignorar URLs externas e arquivos de desenvolvimento
        navigateFallbackDenylist: [/^\/api/, /^http/, /\.ts$/, /\.tsx$/],
        // ✅ NOVO: Não cachear arquivos .ts/.tsx em dev
        navigateFallbackAllowlist: [/^(?!\/@).*/],
        runtimeCaching: [
          {
            // ✅ NOVO: Arquivos de desenvolvimento (.ts, .tsx, /@) - sempre da rede
            urlPattern: ({ url }) =>
              url.pathname.includes('/@') ||
              url.pathname.endsWith('.ts') ||
              url.pathname.endsWith('.tsx') ||
              url.pathname.includes('/src/'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'dev-files',
            },
          },
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
            handler: 'NetworkFirst', // ✅ MUDANÇA: NetworkFirst para sempre ter arquivos atualizados
            options: {
              cacheName: 'static-resources-v3',
              expiration: {
                maxEntries: 200, // ✅ AUMENTADO: mais espaço para cache
                maxAgeSeconds: 60 * 60 * 24 * 7, // ✅ AUMENTADO: 7 dias
              },
              networkTimeoutSeconds: 5, // ✅ NOVO: timeout antes de usar cache
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
    port: 3000,
    strictPort: true, // ✅ NOVO: Força usar porta 3000, falha se ocupada
    host: '0.0.0.0',
    open: true,
    hmr: {
      // ✅ NOVO: Configuração explícita do HMR WebSocket
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/api/, ''),
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
