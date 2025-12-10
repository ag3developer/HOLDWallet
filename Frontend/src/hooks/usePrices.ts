import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { APP_CONFIG } from '@/config/app'

interface PriceInfo {
  price: number
  change_24h: number
  high_24h: number
  low_24h: number
  [key: string]: any
}

interface UsePricesResult {
  prices: Record<string, PriceInfo>
  loading: boolean
  error: Error | null
}

/**
 * Hook para buscar preços em tempo real de múltiplas criptomoedas
 * @param symbols - Array de símbolos de criptomoedas (ex: ['BTC', 'ETH', 'USDT'])
 * @param currency - Moeda de referência (BRL, USD, EUR, etc.)
 * @returns Objeto com preços, estado de carregamento e erros
 */
export function usePrices(symbols: string[], currency: string = 'USD'): UsePricesResult {
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchPrices = useCallback(async () => {
    if (!symbols || symbols.length === 0) {
      setPrices({})
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Construir query string com símbolos em UPPERCASE
      const symbolsQuery = symbols.map(s => s.toUpperCase()).join(',')
      const currencyCode = currency.toLowerCase()
      console.log('[usePrices] Fetching prices for:', { symbols, currency: currencyCode })

      // Usar axios client com baseURL configurado
      const client = axios.create({
        baseURL: APP_CONFIG.api.baseUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Buscar do novo endpoint batch v2
      const response = await client.get('/api/v1/prices/batch', {
        params: {
          symbols: symbolsQuery,
          fiat: currencyCode,
          refresh: false,
        },
      })

      const data = response.data
      console.log('[usePrices] Response data structure:', {
        hasData: !!data,
        hasPrices: !!data?.prices,
        pricesType: typeof data?.prices,
        pricesKeys: data?.prices ? Object.keys(data.prices) : [],
        fullData: data,
      })

      // Transformar resposta do endpoint batch
      const pricesMap: Record<string, PriceInfo> = {}

      if (data.prices && typeof data.prices === 'object') {
        for (const [symbol, priceInfo] of Object.entries(data.prices)) {
          const info = priceInfo as Record<string, any>
          const symbolUpper = symbol.toUpperCase()
          const price = info.price || 0

          // Debug log for all prices
          console.log('[usePrices] Processing symbol:', {
            originalSymbol: symbol,
            upperSymbol: symbolUpper,
            priceInfo: info,
            extractedPrice: price,
          })

          pricesMap[symbolUpper] = {
            price: price,
            change_24h: info.change_24h || 0,
            high_24h: info.high_24h || 0,
            low_24h: info.low_24h || 0,
            market_cap: info.market_cap,
            volume_24h: info.volume_24h,
          }
        }
      } else if (data.data && typeof data.data === 'object') {
        // Try alternative structure: data.data instead of data.prices
        console.log('[usePrices] Trying alternative structure: data.data')
        for (const [symbol, priceInfo] of Object.entries(data.data)) {
          const info = priceInfo as Record<string, any>
          const symbolUpper = symbol.toUpperCase()
          const price = info.price || info.value || 0

          console.log('[usePrices] Processing from data.data:', {
            originalSymbol: symbol,
            upperSymbol: symbolUpper,
            priceInfo: info,
            extractedPrice: price,
          })

          pricesMap[symbolUpper] = {
            price: price,
            change_24h: info.change_24h || 0,
            high_24h: info.high_24h || 0,
            low_24h: info.low_24h || 0,
            market_cap: info.market_cap,
            volume_24h: info.volume_24h,
          }
        }
      } else {
        console.warn('[usePrices] Unexpected response structure:', data)
      }

      // ...existing code...
      console.log('[usePrices] Prices map updated:', Object.keys(pricesMap), pricesMap)
      setPrices(pricesMap)
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(errorMessage)
      console.error('[usePrices] Error fetching prices:', errorMessage)

      // Retornar dados vazios em caso de erro
      setPrices({})
    } finally {
      setLoading(false)
    }
  }, [symbols.join(','), currency])

  // Buscar preços ao montar o componente e quando dependências mudam
  useEffect(() => {
    fetchPrices()

    // Atualizar a cada 5 segundos (mais responsivo que 10s)
    const interval = setInterval(() => {
      console.log('[usePrices] Auto-refreshing prices every 5 seconds...')
      fetchPrices()
    }, 5000)

    return () => clearInterval(interval)
  }, [fetchPrices])

  return {
    prices,
    loading,
    error,
  }
}

/**
 * Hook para buscar preço de uma única criptomoeda
 * @param symbol - Símbolo da criptomoeda (ex: 'BTC')
 * @param currency - Moeda de referência (BRL, USD, EUR, etc.)
 * @returns Objeto com preço, estado de carregamento e erros
 */
export function usePrice(symbol: string, currency: string = 'USD'): UsePricesResult {
  return usePrices(symbol ? [symbol] : [], currency)
}
