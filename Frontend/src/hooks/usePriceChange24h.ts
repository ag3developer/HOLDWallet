import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'

interface PriceData {
  [key: string]: {
    symbol: string
    change24h: number
    lastUpdated: number
  }
}

const COIN_GECKO_IDS: { [key: string]: string } = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  MATIC: 'matic-network',
  BNB: 'binancecoin',
  TRX: 'tron',
  SOL: 'solana',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  SHIB: 'shiba-inu',
  XRP: 'ripple',
  USDT: 'tether',
  USDC: 'usd-coin',
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos em ms
const priceCache: PriceData = {}

/**
 * Hook para obter a variação de preço de 24h de uma criptomoeda
 * Usa backend proxy para evitar CORS issues
 */
export const usePriceChange24h = (symbol: string) => {
  const [change24h, setChange24h] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuthStore()

  useEffect(() => {
    const fetchPriceChange = async () => {
      // Normalizar símbolo
      const normalizedSymbol = symbol.toUpperCase()

      if (!COIN_GECKO_IDS[normalizedSymbol]) {
        setError(`Moeda não suportada: ${symbol}`)
        return
      }

      // Verificar cache
      const cached = priceCache[normalizedSymbol]
      if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
        setChange24h(cached.change24h)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        if (!token) {
          setError('Token não encontrado')
          return
        }

        // Buscar via backend proxy
        const response = await fetch(
          `http://127.0.0.1:8000/prices/market/price?symbol=${normalizedSymbol}&fiat=usd`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (!response.ok) {
          throw new Error(`Backend API error: ${response.statusText}`)
        }

        const data = await response.json()
        const change = data.change_24h || 0

        // Armazenar em cache
        priceCache[normalizedSymbol] = {
          symbol: normalizedSymbol,
          change24h: change,
          lastUpdated: Date.now(),
        }

        setChange24h(change)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar preço'
        console.error(`[usePriceChange24h] Erro para ${symbol}:`, errorMessage)
        setError(errorMessage)
        // Usar valor padrão em caso de erro
        setChange24h(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPriceChange()
  }, [symbol, token])

  return { change24h, isLoading, error }
}

/**
 * Hook para obter a variação de 24h para múltiplas moedas
 */
export const useMultiplePriceChanges24h = (symbols: string[]) => {
  const [changes, setChanges] = useState<{ [key: string]: number }>({})
  const [isLoading, setIsLoading] = useState(false)
  const { token } = useAuthStore()

  useEffect(() => {
    const fetchAllPrices = async () => {
      const validSymbols = symbols.filter(s => COIN_GECKO_IDS[s.toUpperCase()])

      if (validSymbols.length === 0 || !token) {
        return
      }

      try {
        setIsLoading(true)
        const newChanges: { [key: string]: number } = {}

        // Buscar preço de cada moeda via backend
        for (const symbol of validSymbols) {
          const normalizedSymbol = symbol.toUpperCase()

          try {
            const response = await fetch(
              `http://127.0.0.1:8000/prices/market/price?symbol=${normalizedSymbol}&fiat=usd`,
              { headers: { Authorization: `Bearer ${token}` } }
            )

            if (response.ok) {
              const data = await response.json()
              newChanges[normalizedSymbol] = data.change_24h || 0
            }
          } catch (err) {
            console.error(`[useMultiplePriceChanges24h] Erro para ${symbol}:`, err)
            newChanges[normalizedSymbol] = 0
          }
        }

        setChanges(newChanges)
      } catch (err) {
        console.error('[useMultiplePriceChanges24h] Erro:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (symbols.length > 0) {
      fetchAllPrices()
    }
  }, [JSON.stringify(symbols), token])

  return { changes, isLoading }
}
