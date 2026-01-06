import { useState, useEffect, useCallback } from 'react'
import PriceService from '@/services/price-service'

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
  refetch: () => Promise<void>
}

// Intervalo de atualização em ms (10 segundos para trading em tempo real)
const REFRESH_INTERVAL_MS = 10000

/**
 * Hook para buscar preços em TEMPO REAL de múltiplas criptomoedas
 * ⚠️ SEM CACHE - Preços sempre frescos do backend para evitar prejuízos em trading
 * @param symbols - Array de símbolos de criptomoedas (ex: ['BTC', 'ETH', 'USDT'])
 * @param currency - Moeda de referência (BRL, USD, EUR, etc.)
 * @returns Objeto com preços, estado de carregamento e erros
 */
export function usePrices(symbols: string[], currency: string = 'USD'): UsePricesResult {
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({})
  const [loading, setLoading] = useState(true) // Começar como true para mostrar loading inicial
  const [error, setError] = useState<Error | null>(null)

  // Buscar preços diretamente do backend (SEM CACHE)
  const fetchPrices = useCallback(async () => {
    if (!symbols || symbols.length === 0) {
      setPrices({})
      setLoading(false)
      return
    }

    // Não setar loading em refresh automático para evitar flicker
    // setLoading(true) - removido para UX mais suave

    try {
      console.log('[usePrices] 🔄 Fetching LIVE prices for:', symbols, 'currency:', currency)
      const pricesData = await PriceService.getPrices(symbols, currency)

      // Converter para formato esperado (apenas preços válidos)
      const formattedPrices: Record<string, PriceInfo> = {}
      for (const [symbol, data] of Object.entries(pricesData)) {
        const dataAsAny = data as any
        const price = dataAsAny.price || 0

        // Só incluir se o preço for válido
        if (price > 0) {
          formattedPrices[symbol] = {
            price: price,
            change_24h: dataAsAny.change_24h || 0,
            high_24h: dataAsAny.high_24h || 0,
            low_24h: dataAsAny.low_24h || 0,
          }
        } else {
          console.warn(`[usePrices] ⚠️ Skipping ${symbol} - invalid price: ${price}`)
        }
      }

      if (Object.keys(formattedPrices).length > 0) {
        setPrices(formattedPrices)
        setError(null)
        console.log(
          '[usePrices] ✅ Live prices updated:',
          Object.keys(formattedPrices).length,
          'symbols'
        )
      } else {
        console.warn('[usePrices] ⚠️ No valid prices received from API')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(errorMessage)
      console.error('[usePrices] ❌ Error fetching prices:', errorMessage)
      // Manter preços anteriores em caso de erro (não limpar)
    } finally {
      setLoading(false)
    }
  }, [symbols.join(','), currency])

  // Buscar preços ao montar o componente e atualizar em tempo real
  useEffect(() => {
    // Fetch inicial
    fetchPrices()

    // Atualizar a cada 10 segundos para trading em tempo real
    const interval = setInterval(() => {
      fetchPrices()
    }, REFRESH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [fetchPrices])

  return {
    prices,
    loading,
    error,
    refetch: fetchPrices, // Expor função para refresh manual
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
