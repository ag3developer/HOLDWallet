import { apiClient } from './api'

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
      console.log(`[WalletService] 📤 Fetching balances for wallet: ${walletId}`)

      // Get token for debug
      const token = localStorage.getItem('authToken')
      console.log(
        `[WalletService] 🔐 Auth token status: ${token ? '✅ Present (' + token.substring(0, 20) + '...)' : '❌ Missing'}`
      )

      // The token is automatically added by the interceptor
      const response = await apiClient.get<BalancesResponse>(
        `/wallets/${walletId}/balances?include_tokens=true`
      )

      console.log('[WalletService] ✅ Response received:', response.data)

      if (!response.data?.balances) {
        console.warn('[WalletService] ⚠️ No balances data in response')
        return {}
      }

      // Map balances to symbol format
      const mapped = this.mapBalances(response.data.balances)
      console.log('[WalletService] 📊 Mapped balances:', mapped)
      return mapped
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('[WalletService] ❌ Error fetching wallet balances:', errorMsg)
      return {}
    }
  }

  /**
   * Get all wallets
   */
  static async getWallets() {
    try {
      // 🔧 Use trailing slash to avoid 307 redirect (Safari iOS fix)
      const response = await apiClient.get('/wallets/')
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

      console.log(`[WalletService] Mapping: ${network} -> ${symbol} (amount: ${amount})`)

      if (symbol) {
        mapped[symbol] = (mapped[symbol] || 0) + amount
      }
    }

    console.log('[WalletService] Final mapped balances:', mapped)
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
      // Tokens (must be before networks to avoid partial matches)
      polygon_usdt: 'USDT',
      polygon_usdc: 'USDC',
      ethereum_usdt: 'USDT',
      ethereum_usdc: 'USDC',
      base_usdt: 'USDT',
      base_usdc: 'USDC',
      bsc_usdt: 'USDT',
      bsc_usdc: 'USDC',
      // Networks
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
    }

    // Direct match (most reliable)
    if (networkMap[networkLower]) {
      console.log(`[WalletService] Direct match: ${networkLower} -> ${networkMap[networkLower]}`)
      return networkMap[networkLower]
    }

    // Fuzzy match for fallback
    for (const [key, value] of Object.entries(networkMap)) {
      if (networkLower.includes(key) || key.includes(networkLower)) {
        console.log(`[WalletService] Fuzzy match: ${networkLower} contains ${key} -> ${value}`)
        return value
      }
    }

    console.log(`[WalletService] No match found for: ${networkLower}`)
    return ''
  }
}

export default WalletService
