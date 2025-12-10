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
   * Helper: Get token from localStorage with detailed logging
   */
  private static getToken(): string | null {
    console.log('[WalletService.getToken] Starting token retrieval...')

    // Try Zustand default persist key (auth-storage)
    let token = localStorage.getItem('auth-storage')
    if (token) {
      try {
        const parsed = JSON.parse(token)
        const foundToken = parsed.state?.token || null
        if (foundToken) {
          console.log('[WalletService.getToken] ✅ Found token in auth-storage')
          return foundToken
        }
      } catch {
        // Continue to next location
      }
    }

    // Try custom Zustand persist key (hold-wallet-auth)
    token = localStorage.getItem('hold-wallet-auth')
    if (token) {
      try {
        const parsed = JSON.parse(token)
        const foundToken = parsed.state?.token || null
        if (foundToken) {
          console.log('[WalletService.getToken] ✅ Found token in hold-wallet-auth')
          return foundToken
        }
      } catch {
        // Continue to next location
      }
    }

    // Try direct token key
    token = localStorage.getItem('authToken')
    if (token) {
      console.log('[WalletService.getToken] ✅ Found token in authToken')
      return token
    }

    console.warn('[WalletService.getToken] ❌ No token found in any location')
    return null
  }

  /**
   * Get wallet balances using fetch with retry logic
   */
  static async getWalletBalances(walletId: string): Promise<Record<string, number>> {
    const maxRetries = 2
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const token = this.getToken()

        if (!token) {
          console.error('[WalletService] No authentication token found')
          throw new Error('No authentication token found. Please login first.')
        }

        const url = `${APP_CONFIG.api.baseUrl}/wallets/${walletId}/balances?include_tokens=true`
        console.log(
          `[WalletService] Fetching balances (attempt ${attempt}/${maxRetries}) from: ${url}`
        )

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          })

          clearTimeout(timeoutId)
          console.log(`[WalletService] Response status: ${response.status}`)

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error text')
            console.error(`[WalletService] HTTP Error ${response.status}: ${errorText}`)
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data: BalancesResponse = await response.json()
          console.log('[WalletService] Balances fetched successfully:', data)

          if (!data?.balances) {
            console.warn('[WalletService] No balances data received')
            return {}
          }

          return this.mapBalances(data.balances)
        } catch (fetchError) {
          clearTimeout(timeoutId)
          lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError))

          if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
            console.warn('[WalletService] Request timeout')
          } else {
            console.warn(`[WalletService] Attempt ${attempt} failed:`, lastError.message)
          }

          // Retry on failure (except last attempt)
          if (attempt < maxRetries) {
            console.log(`[WalletService] Retrying in 1 second...`)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.error(`[WalletService] Attempt ${attempt} error:`, lastError)

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    // All retries failed
    console.error('[WalletService] All retry attempts failed. Last error:', lastError)
    throw lastError || new Error('Failed to fetch wallet balances after multiple attempts')
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

    console.log('[WalletService] mapBalances - Input balances:', balances)
    console.log('[WalletService] mapBalances - Keys:', Object.keys(balances || {}))

    for (const [network, balInfo] of Object.entries(balances || {})) {
      console.log(`[WalletService] Processing network: ${network}, balInfo:`, balInfo)

      const networkLower = network.toLowerCase()
      const amount = this.extractBalance(balInfo)
      const symbol = this.mapNetworkToSymbol(networkLower)

      console.log(`[WalletService] Network: ${network} -> Symbol: ${symbol}, Amount: ${amount}`)

      if (symbol) {
        // Only set if not already present - avoid duplicating different networks
        if (mapped[symbol] === undefined) {
          mapped[symbol] = amount
          console.log(`[WalletService] Set ${symbol} = ${amount}`)
        } else {
          // Only accumulate for true duplicates (same network key appearing twice)
          console.warn(
            `[WalletService] Duplicate symbol detected: ${symbol} from network ${network}`
          )
          mapped[symbol] += amount
        }
      } else {
        console.warn(`[WalletService] No symbol found for network: ${network}`)
      }
    }

    console.log('[WalletService] mapBalances - Final result:', mapped)
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
    // Detect stablecoins first (with underscore or hyphen)
    if (networkLower.includes('usdt')) return 'USDT'
    if (networkLower.includes('usdc')) return 'USDC'

    const networkMap: Record<string, string> = {
      polygon: 'MATIC',
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
      tron: 'TRX',
      trx: 'TRX',
      litecoin: 'LTC',
      ltc: 'LTC',
      dogecoin: 'DOGE',
      doge: 'DOGE',
      cardano: 'ADA',
      ada: 'ADA',
      polkadot: 'DOT',
      dot: 'DOT',
      chainlink: 'LINK',
      link: 'LINK',
      shiba: 'SHIB',
      shib: 'SHIB',
      xrp: 'XRP',
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
