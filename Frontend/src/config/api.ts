/**
 * API Configuration
 * Centraliza todas as URLs da API para fácil manutenção
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiConfig = {
  baseURL: API_URL,

  // Auth endpoints
  auth: {
    login: `${API_URL}/api/v1/auth/login`,
    signup: `${API_URL}/api/v1/auth/signup`,
    logout: `${API_URL}/api/v1/auth/logout`,
    refresh: `${API_URL}/api/v1/auth/refresh`,
    verify: `${API_URL}/api/v1/auth/verify`,
  },

  // User endpoints
  user: {
    profile: `${API_URL}/api/v1/user/profile`,
    update: `${API_URL}/api/v1/user/profile`,
    settings: `${API_URL}/api/v1/user/settings`,
  },

  // Wallet endpoints
  wallet: {
    list: `${API_URL}/api/v1/wallet/list`,
    create: `${API_URL}/api/v1/wallet/create`,
    balance: `${API_URL}/api/v1/wallet/balance`,
    addresses: `${API_URL}/api/v1/wallet/addresses`,
  },

  // Trading endpoints
  trading: {
    quote: `${API_URL}/api/v1/trading/quote`,
    createOrder: `${API_URL}/api/v1/trading/create-order`,
    getOrder: `${API_URL}/api/v1/trading/order`,
    listOrders: `${API_URL}/api/v1/trading/orders`,
  },

  // Payment endpoints
  payment: {
    methods: `${API_URL}/api/v1/payment/methods`,
    transfbank: {
      generate: `${API_URL}/api/v1/payment/transfbank/generate`,
      verify: `${API_URL}/api/v1/payment/transfbank/verify`,
    },
  },

  // Health check
  health: `${API_URL}/api/v1/health`,
}

/**
 * Função helper para fazer requisições com token
 */
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token')

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
