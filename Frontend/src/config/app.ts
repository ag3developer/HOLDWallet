// Configurações globais da aplicação
// ⚠️ IMPORTANTE: Use variáveis de ambiente (.env.production) para produção

// Log de informações de configuração
const getEnvironmentInfo = () => {
  if (import.meta.env.PROD) {
    console.log('[CONFIG] 🚀 Production Mode Detected')
    console.log('[CONFIG] API Base URL:', import.meta.env.VITE_API_URL)
  } else {
    console.log('[CONFIG] 🔧 Development Mode')
    console.log('[CONFIG] API Base URL:', import.meta.env.VITE_API_URL)
  }
}

getEnvironmentInfo()

export const APP_CONFIG = {
  name: 'Wolknow',
  version: '1.0.0',
  description: 'Plataforma P2P de trading com sistema de chat e reputação',
  environment: import.meta.env.MODE,

  // URLs da API - CARREGADAS DO .env
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
    wsUrl: import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws',
    endpoints: {
      auth: '', // Auth endpoints are at root level: /auth, /auth/register, etc
      users: '/users',
      wallets: '/wallets',
      p2p: '/p2p',
      chat: '/chat',
      notifications: '/notifications',
    },
  },

  // Configurações de paginação
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },

  // Configurações de upload de arquivos
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/webp'],
      documents: ['application/pdf', 'text/plain'],
      all: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'],
    },
  },

  // Configurações de criptografia
  crypto: {
    supportedCoins: ['BTC', 'ETH', 'USDT', 'BNB', 'ADA', 'SOL', 'DOT', 'MATIC'],
    networks: {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      USDT: 'ethereum',
      BNB: 'bsc',
      ADA: 'cardano',
      SOL: 'solana',
      DOT: 'polkadot',
      MATIC: 'polygon',
    },
  },

  // Configurações do chat
  chat: {
    maxMessageLength: 1000,
    typingTimeout: 3000,
    reconnectAttempts: 5,
    reconnectInterval: 2000,
  },

  // Configurações de segurança
  security: {
    sessionTimeout: 30 * 60 * 1000, // 30 minutos
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutos
  },

  // Configurações de notificação
  notifications: {
    position: 'top-right' as const,
    duration: 4000,
    maxNotifications: 5,
  },

  // Configurações de tema
  theme: {
    default: 'light' as const,
    storageKey: 'hold-wallet-theme',
  },

  // Configurações de idioma
  i18n: {
    default: 'pt-BR' as const,
    storageKey: 'hold-wallet-language',
    fallback: 'en-US' as const,
    supported: ['pt-BR', 'en-US', 'es-ES', 'zh-CN', 'ja-JP', 'ko-KR'] as const,
  },

  // Configurações de storage
  storage: {
    prefix: 'hold-wallet-',
    keys: {
      auth: 'auth',
      theme: 'theme',
      language: 'language',
      settings: 'settings',
    },
  },

  // URLs externas
  external: {
    website: 'https://holdwallet.com',
    support: 'https://support.holdwallet.com',
    docs: 'https://docs.holdwallet.com',
    terms: 'https://holdwallet.com/terms',
    privacy: 'https://holdwallet.com/privacy',
    github: 'https://github.com/holdwallet',
  },

  // Configurações de desenvolvimento
  development: {
    enableDevTools: import.meta.env.DEV,
    debugMode: import.meta.env.DEV,
    mockData: false,
  },
} as const

// Tipos derivados da configuração
export type SupportedCoin = (typeof APP_CONFIG.crypto.supportedCoins)[number]
export type ApiEndpoint = keyof typeof APP_CONFIG.api.endpoints
export type ThemeMode = typeof APP_CONFIG.theme.default
export type SupportedLanguage = typeof APP_CONFIG.i18n.default

export default APP_CONFIG
