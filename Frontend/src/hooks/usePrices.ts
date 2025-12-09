import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'

export interface Price {
  symbol: string
  price: number
  change_24h: number
  source: string
  cached: boolean
  timestamp: string
}

interface PricesMap {
  [symbol: string]: Price
}

interface UsePricesReturn {
  prices: PricesMap
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const API_BASE = 'http://127.0.0.1:8000'
const CACHE_TTL = 60000 // 1 minute (backend caches for 20 min)

interface CachedData {
  prices: PricesMap
  timestamp: number
  fiat: string
}

export function usePrices(symbols: string[], fiat: string = 'BRL'): UsePricesReturn {
  const { token } = useAuthStore()
  const [prices, setPrices] = useState<PricesMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Local cache to avoid unnecessary fetches
  const cache = useMemo(() => {
    return {
      data: null as CachedData | null,
      isExpired: function () {
        return !this.data || Date.now() - this.data.timestamp > CACHE_TTL || this.data.fiat !== fiat
      },
      get: function () {
        return this.isExpired() ? null : this.data?.prices
      },
      set: function (newPrices: PricesMap) {
        this.data = {
          prices: newPrices,
          timestamp: Date.now(),
          fiat: fiat,
        }
      },
    }
  }, [fiat])

  const fetchPrices = useCallback(async () => {
    if (!token || symbols.length === 0) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Check local cache first
      const cachedPrices = cache.get()
      if (cachedPrices) {
        setPrices(cachedPrices)
        setLoading(false)
        return
      }

      // If no cache, fetch from backend
      // Use batch endpoint for multiple prices at once
      const symbolsStr = symbols.join(',')
      const response = await fetch(
        `${API_BASE}/api/v1/prices/batch?symbols=${symbolsStr}&fiat=${fiat}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        // Try individual requests as fallback
        console.warn('Batch endpoint failed, trying individual requests')
        await fetchPricesIndividual(symbols, fiat, token)
        return
      }

      const data = await response.json()
      const pricesMap: PricesMap = {}

      // Convert array to map
      if (Array.isArray(data.prices)) {
        for (const price of data.prices) {
          pricesMap[price.symbol] = price
        }
      } else if (typeof data.prices === 'object') {
        Object.assign(pricesMap, data.prices)
      }

      // Cache locally
      cache.set(pricesMap)
      setPrices(pricesMap)
    } catch (err) {
      console.error('Error fetching prices:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch prices')
      // Fallback to individual requests
      await fetchPricesIndividual(symbols, fiat, token)
    } finally {
      setLoading(false)
    }
  }, [token, symbols.join(','), fiat, cache])

  // Refetch function that clears cache
  const refetch = useCallback(async () => {
    cache.data = null
    await fetchPrices()
  }, [fetchPrices, cache])

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchPrices()

    // Auto-refresh every 1 minute (backend caches for 20 min)
    const interval = setInterval(fetchPrices, 60000)

    return () => clearInterval(interval)
  }, [fetchPrices])

  return {
    prices,
    loading,
    error,
    refetch,
  }
}

/**
 * Fallback: fetch individual prices if batch fails
 */
async function fetchPricesIndividual(
  symbols: string[],
  fiat: string,
  token: string
): Promise<PricesMap> {
  const promises = symbols.map(symbol =>
    fetch(`${API_BASE}/prices/market/price?symbol=${symbol}&fiat=${fiat}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => (res.ok ? res.json() : null))
      .catch(() => null)
  )

  const results = await Promise.all(promises)
  const pricesMap: PricesMap = {}

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const symbol = symbols[i]
    if (result && symbol) {
      pricesMap[symbol] = result
    }
  }

  return pricesMap
}
