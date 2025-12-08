import { useState, useEffect } from 'react'

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
 * Usa CoinGecko API (gratuito, sem autenticação)
 */
export const usePriceChange24h = (symbol: string) => {
  const [change24h, setChange24h] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPriceChange = async () => {
      // Normalizar símbolo
      const normalizedSymbol = symbol.toUpperCase()
      const coinGeckoId = COIN_GECKO_IDS[normalizedSymbol]

      if (!coinGeckoId) {
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

        // Buscar dados da CoinGecko API
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
        )

        if (!response.ok) {
          throw new Error(`CoinGecko API error: ${response.statusText}`)
        }

        const data = await response.json()
        const priceData = data[coinGeckoId]

        if (!priceData) {
          throw new Error(`Dados não encontrados para ${coinGeckoId}`)
        }

        const change = priceData.usd_24h_change || 0

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
  }, [symbol])

  return { change24h, isLoading, error }
}

/**
 * Hook para obter a variação de 24h para múltiplas moedas
 */
export const useMultiplePriceChanges24h = (symbols: string[]) => {
  const [changes, setChanges] = useState<{ [key: string]: number }>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchAllPrices = async () => {
      const coinGeckoIds = symbols
        .map(s => COIN_GECKO_IDS[s.toUpperCase()])
        .filter(Boolean)
        .join(',')

      if (!coinGeckoIds) {
        return
      }

      try {
        setIsLoading(true)

        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoIds}&vs_currencies=usd&include_24hr_change=true`
        )

        if (!response.ok) {
          throw new Error(`CoinGecko API error: ${response.statusText}`)
        }

        const data = await response.json()
        const newChanges: { [key: string]: number } = {}

        for (const symbol of symbols) {
          const normalizedSymbol = symbol.toUpperCase()
          const coinGeckoId = COIN_GECKO_IDS[normalizedSymbol]

          if (coinGeckoId && data[coinGeckoId]) {
            newChanges[normalizedSymbol] = data[coinGeckoId].usd_24h_change || 0
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
  }, [JSON.stringify(symbols)])

  return { changes, isLoading }
}
