import { useState, useEffect } from 'react'
import { usePrices } from './usePrices'

/**
 * Hook para obter a variação de preço de 24h de uma criptomoeda
 * Usa o backend agregador de preços em vez de requisições diretas ao CoinGecko
 */
export const usePriceChange24h = (symbol: string) => {
  const [change24h, setChange24h] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Usar o hook usePrices que já faz requisições via backend
  const { prices, loading, error: pricesError } = usePrices([symbol], 'usd')

  useEffect(() => {
    if (loading) {
      setIsLoading(true)
      return
    }

    setIsLoading(false)

    if (pricesError) {
      const errorMsg = pricesError instanceof Error ? pricesError.message : String(pricesError)
      setError(errorMsg)
      setChange24h(0)
      return
    }

    // Obter o preço do símbolo
    const priceData = prices[symbol.toUpperCase()]
    if (priceData) {
      setChange24h(priceData.change_24h || 0)
      setError(null)
    } else {
      setError(`Moeda não suportada: ${symbol}`)
      setChange24h(0)
    }
  }, [prices, loading, pricesError, symbol])

  return { change24h, isLoading, error }
}

/**
 * Hook para obter a variação de 24h para múltiplas moedas
 */
export const useMultiplePriceChanges24h = (symbols: string[]) => {
  const [changes, setChanges] = useState<{ [key: string]: number }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Serializar symbols para evitar loop infinito
  const sortedSymbols = [...symbols].sort((a, b) => a.localeCompare(b))
  const symbolsKey = JSON.stringify(sortedSymbols)

  // Usar o hook usePrices que já faz requisições via backend
  const { prices, loading, error: pricesError } = usePrices(symbols, 'usd')

  useEffect(() => {
    if (loading) {
      setIsLoading(true)
      return
    }

    setIsLoading(false)

    if (pricesError) {
      const errorMsg = pricesError instanceof Error ? pricesError.message : String(pricesError)
      setError(errorMsg)
      setChanges({})
      return
    }

    // Mapear preços para mudanças de 24h
    const newChanges: { [key: string]: number } = {}
    for (const symbol of symbols) {
      const normalizedSymbol = symbol.toUpperCase()
      const priceData = prices[normalizedSymbol]
      if (priceData) {
        newChanges[normalizedSymbol] = priceData.change_24h || 0
      }
    }

    setChanges(newChanges)
    setError(null)
  }, [prices, loading, pricesError, symbolsKey])

  return { changes, isLoading, error }
}
