import { useMemo } from 'react'
import { usePrices } from './usePrices'

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

const CRYPTO_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  USDT: 'Tether',
  USDC: 'USD Coin',
  XRP: 'Ripple',
  ADA: 'Cardano',
  SOL: 'Solana',
  DOT: 'Polkadot',
  LINK: 'Chainlink',
  MATIC: 'Polygon',
  BNB: 'Binance Coin',
  LTC: 'Litecoin',
  DOGE: 'Dogecoin',
  AVAX: 'Avalanche',
  SHIB: 'Shiba Inu',
}

/**
 * Hook para buscar preços de múltiplas criptomoedas
 */
export const useMarketPrices = (cryptoIds: string[] = [], currency: string = 'USD'): UseMarketPricesResult => {
  // Usar o hook usePrices que agrega preços via backend
  const { prices: rawPrices, loading, error } = usePrices(cryptoIds, currency)

  // Converter dados para formato esperado
  const prices = useMemo(() => {
    const result: Record<string, CryptoPriceData> = {}

    for (const symbol of cryptoIds) {
      const upperSymbol = symbol.toUpperCase()
      const priceInfo = rawPrices[upperSymbol]

      if (priceInfo) {
        const price = priceInfo.price || 0
        const change24h = priceInfo.change_24h || 0

        result[upperSymbol] = {
          symbol: upperSymbol,
          name: CRYPTO_NAMES[upperSymbol] || upperSymbol,
          price,
          priceUSD: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: price < 1 ? 6 : 2,
            maximumFractionDigits: price < 1 ? 6 : 2,
          }).format(price),
          change24h,
          change24hPercent: `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`,
          updatedAt: new Date(),
        }
      }
    }

    return result
  }, [rawPrices, cryptoIds])

  return {
    prices,
    isLoading: loading,
    isError: !!error,
    error,
    refetch: () => {
      // O hook usePrices já atualiza automaticamente a cada 5 segundos
    },
  }
}

/**
 * Hook para buscar preço de uma única criptomoeda
 */
export const useMarketPrice = (
  cryptoId: string,
  currency: string = 'USD'
): CryptoPriceData | null => {
  const { prices } = useMarketPrices(cryptoId ? [cryptoId] : [], currency)
  return prices[cryptoId?.toUpperCase() || ''] || null
}
