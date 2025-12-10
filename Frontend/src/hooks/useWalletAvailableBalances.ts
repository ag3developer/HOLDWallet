import { useState, useEffect } from 'react'
import { APP_CONFIG } from '../config/app'

export interface BalanceInfo {
  available: number
  locked: number
  total: number
}

export interface AvailableBalances {
  [symbol: string]: BalanceInfo
}

/**
 * Helper: Map network name to crypto symbol
 */
function mapNetworkToSymbol(network: string): string {
  const networkLower = network.toLowerCase()

  // Detect stablecoins
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
  }

  return networkMap[networkLower] || ''
}

/**
 * Hook para buscar saldos DISPONÍVEIS (descontando o que está bloqueado em P2P)
 * Usa fetch direto com token do localStorage
 */
export function useWalletAvailableBalances(walletId?: string) {
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!walletId) {
      console.log('[useWalletAvailableBalances] No wallet ID provided')
      setLoading(false)
      setBalances({})
      return
    }

    const getToken = (): string | null => {
      const authState = localStorage.getItem('auth-storage')
      if (authState) {
        try {
          const parsed = JSON.parse(authState)
          return parsed.state?.token || null
        } catch {
          // Fallback
        }
      }
      return localStorage.getItem('authToken')
    }

    const fetchBalances = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = getToken()
        if (!token) {
          throw new Error('No authentication token found')
        }

        console.log('[useWalletAvailableBalances] Fetching for wallet:', walletId)

        // Try available endpoint first
        let response = await fetch(
          `${APP_CONFIG.api.baseUrl}/wallets/${walletId}/balances/available?include_tokens=true`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        )

        // Fallback to regular endpoint if not found
        if (response.status === 404) {
          console.log('[useWalletAvailableBalances] Endpoint available not found, using fallback')
          response = await fetch(
            `${APP_CONFIG.api.baseUrl}/wallets/${walletId}/balances?include_tokens=true`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            }
          )
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        console.log('[useWalletAvailableBalances] Balances:', data)

        // Process response
        const simplifiedBalances: Record<string, number> = {}

        if (data.balances && typeof data.balances === 'object') {
          for (const [network, balInfo] of Object.entries(data.balances)) {
            const symbol = mapNetworkToSymbol(network as string)
            if (symbol && balInfo) {
              const amount =
                typeof balInfo === 'object' && balInfo !== null && 'balance' in balInfo
                  ? Number.parseFloat(String((balInfo as any).balance)) || 0
                  : typeof balInfo === 'number'
                    ? balInfo
                    : 0

              if (!simplifiedBalances[symbol]) {
                simplifiedBalances[symbol] = amount
              }
            }
          }
        }

        setBalances(simplifiedBalances)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch balances')
        console.error('[useWalletAvailableBalances] Error:', error)
        setError(error)
        setBalances({})
      } finally {
        setLoading(false)
      }
    }

    fetchBalances()
  }, [walletId])

  return { balances, loading, error }
}
