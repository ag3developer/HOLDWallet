import { useState, useEffect, useCallback } from 'react'
import PriceService from '@/services/price-service'
import PriceCache from '@/services/price-cache'

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
 * Usa serviço centralizado com deduplicação e cache
 * @param symbols - Array de símbolos de criptomoedas (ex: ['BTC', 'ETH', 'USDT'])
 * @param currency - Moeda de referência (BRL, USD, EUR, etc.)
 * @returns Objeto com preços, estado de carregamento e erros
 */
export function usePrices(symbols: string[], currency: string = 'USD'): UsePricesResult {
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Carregar preços em cache imediatamente
  useEffect(() => {
    const cachedPrices: Record<string, PriceInfo> = {}

    for (const symbol of symbols) {
      const cached = PriceCache.getPrice(symbol, currency)
      if (cached) {
        cachedPrices[symbol.toUpperCase()] = {
          price: cached.price,
          change_24h: 0,
          high_24h: 0,
          low_24h: 0,
        }
      }
    }

    if (Object.keys(cachedPrices).length > 0) {
      console.log('[usePrices] Loading cached prices:', Object.keys(cachedPrices))
      setPrices(cachedPrices)
    }
  }, [symbols.join(','), currency])

  // Buscar preços atualizados do serviço centralizado
  const fetchPrices = useCallback(async () => {
    if (!symbols || symbols.length === 0) {
      setPrices({})
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('[usePrices] Fetching prices for:', symbols, 'currency:', currency)
      const pricesData = await PriceService.getPrices(symbols, currency)

      // Converter para formato esperado
      const formattedPrices: Record<string, PriceInfo> = {}
      for (const [symbol, data] of Object.entries(pricesData)) {
        const dataAsAny = data as any
        formattedPrices[symbol] = {
          price: dataAsAny.price || 0,
          change_24h: dataAsAny.change_24h || 0,
          high_24h: dataAsAny.high_24h || 0,
          low_24h: dataAsAny.low_24h || 0,
        }
      }

      console.log('[usePrices] Prices fetched successfully:', Object.keys(formattedPrices))
      setPrices(formattedPrices)

      // Salvar em cache
      const simplePrices: Record<string, number> = {}
      for (const [symbol, info] of Object.entries(formattedPrices)) {
        simplePrices[symbol] = info.price
      }
      PriceCache.setPrices(simplePrices, currency)
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(errorMessage)
      console.error('[usePrices] Error fetching prices:', errorMessage)
      setPrices({})
    } finally {
      setLoading(false)
    }
  }, [symbols.join(','), currency])

  // Buscar preços ao montar o componente e quando dependências mudam
  useEffect(() => {
    fetchPrices()

    // Atualizar a cada 30 segundos (reduzido de 5s para melhor performance)
    const interval = setInterval(() => {
      console.log('[usePrices] Auto-refreshing prices...')
      fetchPrices()
    }, 30000) // 30 segundos

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
