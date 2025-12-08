import { useState, useEffect } from 'react'
import { marketPriceService } from '@/services/market-price-service'

interface CryptoPriceData {
  symbol: string
  name: string
  price: number
  priceUSD: string
  change24h: number
  change24hPercent: string
  updatedAt: Date
}

interface UseMarketPricesResult {
  prices: Record<string, CryptoPriceData>
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook para buscar preços de múltiplas criptomoedas
 */
export const useMarketPrices = (cryptoIds: string[] = []): UseMarketPricesResult => {
  const [prices, setPrices] = useState<Record<string, CryptoPriceData>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchPrices = async () => {
    if (cryptoIds.length === 0) {
      setPrices({})
      return
    }

    setIsLoading(true)
    setIsError(false)
    setError(null)

    try {
      const results = await marketPriceService.getPrices(cryptoIds)
      const pricesMap: Record<string, CryptoPriceData> = {}

      results.forEach(price => {
        pricesMap[price.symbol.toLowerCase()] = price
      })

      setPrices(pricesMap)
    } catch (err) {
      setIsError(true)
      setError(err instanceof Error ? err : new Error('Unknown error'))
      console.error('Error fetching market prices:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPrices()

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchPrices, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [cryptoIds.join(',')])

  return {
    prices,
    isLoading,
    isError,
    error,
    refetch: fetchPrices,
  }
}

/**
 * Hook para buscar preço de uma única criptomoeda
 */
export const useMarketPrice = (
  cryptoId: string
): UseMarketPricesResult['prices'][string] | null => {
  const [price, setPrice] = useState<CryptoPriceData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!cryptoId) return

    setIsLoading(true)

    marketPriceService.getPrice(cryptoId).then(result => {
      setPrice(result)
      setIsLoading(false)
    })

    // Atualizar a cada 5 minutos
    const interval = setInterval(
      () => {
        marketPriceService.getPrice(cryptoId).then(setPrice)
      },
      5 * 60 * 1000
    )

    return () => clearInterval(interval)
  }, [cryptoId])

  return price
}
