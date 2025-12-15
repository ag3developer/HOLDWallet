/**
 * API Configuration
 * Centraliza todas as URLs da API para fácil manutenção
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiConfig = {
  baseURL: API_URL,

  // Auth endpoints
  auth: {
    login: `${API_URL}/auth/login`,
    signup: `${API_URL}/auth/register`, // Backend usa /register, não /signup
    logout: `${API_URL}/auth/logout`,
    refresh: `${API_URL}/auth/refresh`,
    verify: `${API_URL}/auth/verify`,
  },

  // User endpoints
  user: {
    profile: `${API_URL}/users/me`,
    update: `${API_URL}/users/me`,
    wallets: `${API_URL}/users/me/wallets`,
    settings: `${API_URL}/users/me/settings`,
  },

  // Wallet endpoints (legacy - usa /wallet)
  wallet: {
    list: `${API_URL}/wallet`, // GET /wallet/ - lista wallets
    create: `${API_URL}/wallet`, // POST /wallet/ - cria wallet
    balance: `${API_URL}/wallet`, // GET /wallet/{wallet_id}/balance
    addresses: `${API_URL}/wallet`, // POST /wallet/{wallet_id}/addresses
  },

  // HD Wallets endpoints (novo - usa /wallets)
  wallets: {
    create: `${API_URL}/wallets/create`, // POST /wallets/create
    restore: `${API_URL}/wallets/restore`, // POST /wallets/restore
    list: `${API_URL}/wallets`, // GET /wallets/
    addresses: `${API_URL}/wallets`, // GET /wallets/{wallet_id}/addresses
    balances: `${API_URL}/wallets`, // GET /wallets/{wallet_id}/balances
    mnemonic: `${API_URL}/wallets`, // GET /wallets/{wallet_id}/mnemonic
    transactions: `${API_URL}/wallets`, // GET /wallets/{wallet_id}/transactions
    validateAddress: `${API_URL}/wallets/validate-address`, // POST
    estimateFee: `${API_URL}/wallets/estimate-fee`, // POST
    send: `${API_URL}/wallets/send`, // POST
  },

  // Trading endpoints
  trading: {
    quote: `${API_URL}/trading/quote`,
    createOrder: `${API_URL}/trading/create-order`,
    getOrder: `${API_URL}/trading/order`,
    listOrders: `${API_URL}/trading/orders`,
  },

  // Payment endpoints
  payment: {
    methods: `${API_URL}/payment/methods`,
    transfbank: {
      generate: `${API_URL}/payment/transfbank/generate`,
      verify: `${API_URL}/payment/transfbank/verify`,
    },
  },

  // Health check
  health: `${API_URL}/health`,
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
