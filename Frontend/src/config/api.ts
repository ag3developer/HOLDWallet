/**
 * API Configuration
 * Centraliza todas as URLs da API para fácil manutenção
 *
 * 🔧 AMBIENTES SUPORTADOS:
 * - Desenvolvimento: localhost:8000 (quando VITE_API_URL não definida)
 * - Produção: https://api.wolknow.com/v1 (via VITE_API_URL)
 *
 * Para desenvolver localmente:
 * 1. Criar arquivo .env.local na raiz do Frontend/
 * 2. Adicionar: VITE_API_URL=http://localhost:8000
 * 3. Rodar: npm run dev
 *
 * Para produção (Vercel):
 * - Definir VITE_API_URL=https://api.wolknow.com/v1 nas variáveis de ambiente
 */

// Detecta ambiente automaticamente
const isDevelopment = import.meta.env.MODE === 'development'
const API_URL =
  import.meta.env.VITE_API_URL ||
  (isDevelopment ? 'http://localhost:8000' : 'https://api.wolknow.com/v1')

console.log('🌍 API Environment:', {
  mode: import.meta.env.MODE,
  apiUrl: API_URL,
  isDevelopment,
})

export const apiConfig = {
  baseURL: API_URL,

  // Auth endpoints (CAMINHOS RELATIVOS - axios adiciona baseURL automaticamente)
  auth: {
    login: '/auth/login',
    signup: '/auth/register', // Backend usa /register, não /signup
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    verify: '/auth/verify',
  },

  // User endpoints
  user: {
    profile: '/users/me',
    update: '/users/me',
    wallets: '/users/me/wallets',
    settings: '/users/me/settings',
  },

  // Wallet endpoints (legacy - usa /wallet)
  wallet: {
    list: '/wallet', // GET /wallet/ - lista wallets
    create: '/wallet', // POST /wallet/ - cria wallet
    balance: '/wallet', // GET /wallet/{wallet_id}/balance
    addresses: '/wallet', // POST /wallet/{wallet_id}/addresses
  },

  // HD Wallets endpoints (novo - usa /wallets)
  wallets: {
    create: '/wallets/create', // POST /wallets/create
    restore: '/wallets/restore', // POST /wallets/restore
    list: '/wallets', // GET /wallets/
    addresses: '/wallets', // GET /wallets/{wallet_id}/addresses
    balances: '/wallets', // GET /wallets/{wallet_id}/balances
    mnemonic: '/wallets', // GET /wallets/{wallet_id}/mnemonic
    transactions: '/wallets', // GET /wallets/{wallet_id}/transactions
    validateAddress: '/wallets/validate-address', // POST
    estimateFee: '/wallets/estimate-fee', // POST
    send: '/wallets/send', // POST
  },

  // Trading endpoints
  trading: {
    quote: '/trading/quote',
    createOrder: '/trading/create-order',
    getOrder: '/trading/order',
    listOrders: '/trading/orders',
  },

  // Payment endpoints
  payment: {
    methods: '/payment/methods',
    transfbank: {
      generate: '/payment/transfbank/generate',
      verify: '/payment/transfbank/verify',
    },
  },

  // Health check
  health: '/health',
}

/**
 * Função helper para fazer requisições com token
 */
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  // Get token from Zustand persist storage (hold-wallet-auth)
  let token: string | null = null
  try {
    const authData = localStorage.getItem('hold-wallet-auth')
    if (authData) {
      const parsed = JSON.parse(authData)
      token = parsed?.state?.token || null
    }
  } catch (e) {
    console.warn('[apiCall] Failed to get token from localStorage:', e)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Merge custom headers
  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => {
      headers[key] = value
    })
  } else if (typeof options.headers === 'object' && options.headers !== null) {
    Object.assign(headers, options.headers)
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `API Error: ${response.statusText}`)
  }

  return response.json()
}

export default apiConfig
