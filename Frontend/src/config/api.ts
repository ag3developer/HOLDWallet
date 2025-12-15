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
    signup: `${API_URL}/auth/signup`,
    logout: `${API_URL}/auth/logout`,
    refresh: `${API_URL}/auth/refresh`,
    verify: `${API_URL}/auth/verify`,
  },

  // User endpoints
  user: {
    profile: `${API_URL}/user/profile`,
    update: `${API_URL}/user/profile`,
    settings: `${API_URL}/user/settings`,
  },

  // Wallet endpoints
  wallet: {
    list: `${API_URL}/wallet/list`,
    create: `${API_URL}/wallet/create`,
    balance: `${API_URL}/wallet/balance`,
    addresses: `${API_URL}/wallet/addresses`,
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
