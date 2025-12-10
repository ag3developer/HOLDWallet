import axios, { AxiosError } from 'axios'
import { APP_CONFIG } from '../config/app'

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: APP_CONFIG.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
apiClient.interceptors.request.use(
  config => {
    // Try to get token from Zustand store (persisted to localStorage)
    let token: string | null = null

    // Check Zustand persisted state in localStorage
    const authState = localStorage.getItem('auth-storage')
    if (authState) {
      try {
        const parsed = JSON.parse(authState)
        token = parsed.state?.token || null
      } catch (error) {
        console.debug(
          '[WalletService] Could not parse auth state:',
          error instanceof Error ? error.message : String(error)
        )
      }
    }

    // Fallback to direct localStorage key
    if (!token) {
      token = localStorage.getItem('authToken')
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.debug('[WalletService] Token added to request:', token.substring(0, 20) + '...')
    } else {
      console.warn('[WalletService] No auth token found')
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Handle 403/401 responses
apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response?.status === 403) {
      console.error('[WalletService] 403 Forbidden - Token may be invalid or expired')
      // Clear token if it's invalid
      localStorage.removeItem('authToken')
    } else if (error.response?.status === 401) {
      console.error('[WalletService] 401 Unauthorized - Please login again')
      localStorage.removeItem('authToken')
    }
    return Promise.reject(error)
  }
)

export interface Balance {
  symbol: string
  amount: number
  network: string
}

export interface BalancesResponse {
  wallet_id: string
  balances: Record<string, any>
}

export class WalletService {
  /**
   * Get wallet balances
   */
  static async getWalletBalances(walletId: string): Promise<Record<string, number>> {
    try {
      // Try to get token - check all possible locations
      let token: string | null = null

      // First, try Zustand persisted state
      const authState = localStorage.getItem('auth-storage')
      if (authState) {
        try {
          const parsed = JSON.parse(authState)
          token = parsed.state?.token || null
        } catch (error) {
          console.debug(
            '[WalletService] Could not parse auth state:',
            error instanceof Error ? error.message : String(error)
          )
        }
      }

      // Fallback to direct localStorage key
      if (!token) {
        token = localStorage.getItem('authToken')
      }

      if (!token) {
        console.error('[WalletService] No authentication token found')
        console.debug('[WalletService] Checked locations: auth-storage, authToken')
        throw new Error('No authentication token found. Please login first.')
      }

      console.log(`[WalletService] Fetching balances for wallet: ${walletId}`)
      console.debug(`[WalletService] Using token: ${token.substring(0, 20)}...`)

      const response = await apiClient.get<BalancesResponse>(`/wallets/${walletId}/balances`)

      console.log('[WalletService] Balances fetched successfully:', response.data)

      if (!response.data?.balances) {
        console.warn('[WalletService] No balances data received')
        return {}
      }

      // Map balances to symbol format
      return this.mapBalances(response.data.balances)
    } catch (error) {
      console.error('[WalletService] Error fetching wallet balances:', error)
      throw error
    }
  }

  /**
   * Get all wallets
   */
  static async getWallets() {
    try {
      const response = await apiClient.get('/wallets')
      return response.data
    } catch (error) {
      console.error('[WalletService] Error fetching wallets:', error)
      throw error
    }
  }

  /**
   * Map network balances to symbol format
   */
  private static mapBalances(balances: Record<string, any>): Record<string, number> {
    const mapped: Record<string, number> = {}

    for (const [network, balInfo] of Object.entries(balances || {})) {
      const networkLower = network.toLowerCase()
      const amount = this.extractBalance(balInfo)
      const symbol = this.mapNetworkToSymbol(networkLower)

      if (symbol) {
        mapped[symbol] = (mapped[symbol] || 0) + amount
      }
    }

    return mapped
  }

  /**
   * Extract balance amount from balance info
   */
  private static extractBalance(balInfo: any): number {
    if (typeof balInfo === 'object' && balInfo?.balance !== undefined) {
      return Number.parseFloat(String(balInfo.balance)) || 0
    }
    return typeof balInfo === 'number' ? balInfo : 0
  }

  /**
   * Map network name to crypto symbol
   */
  private static mapNetworkToSymbol(networkLower: string): string {
    const networkMap: Record<string, string> = {
      polygon: 'MATIC',
      'polygon-usdt': 'USDT',
      'polygon-usdc': 'USDC',
      base: 'BASE',
      ethereum: 'ETH',
      eth: 'ETH',
      bitcoin: 'BTC',
      btc: 'BTC',
      solana: 'SOL',
      sol: 'SOL',
      avalanche: 'AVAX',
      avax: 'AVAX',
      arbitrum: 'ARB',
      arb: 'ARB',
      optimism: 'OP',
      op: 'OP',
      bnb: 'BNB',
      bsc: 'BNB',
    }

    // Direct match
    if (networkMap[networkLower]) {
      return networkMap[networkLower]
    }

    // Fuzzy match
    for (const [key, value] of Object.entries(networkMap)) {
      if (networkLower.includes(key) || key.includes(networkLower)) {
        return value
      }
    }

    return ''
  }
}

export default WalletService
