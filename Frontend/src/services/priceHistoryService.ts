/**
 * Price History Service
 * Fetches real historical price data from backend/CoinGecko
 */

import { apiClient } from './api'

export interface PriceHistoryPoint {
  timestamp: number
  price: number
}

export interface OHLCVData {
  open: number[]
  high: number[]
  low: number[]
  close: number[]
  volume: number[]
  timestamps: number[]
}

export interface MarketChartData {
  prices: [number, number][]
  market_caps: [number, number][]
  total_volumes: [number, number][]
}

class PriceHistoryService {
  private readonly cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  /**
   * Get historical price data for a symbol
   */
  async getPriceHistory(
    symbol: string,
    days: number = 30,
    currency: string = 'usd'
  ): Promise<number[]> {
    const cacheKey = `history_${symbol}_${days}_${currency}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      console.log(`[PriceHistoryService] 📊 Fetching ${days}d history for ${symbol}...`)

      // Backend expects symbol in path: /prices/history/{symbol}
      const response = await apiClient.get<MarketChartData>(
        `/prices/history/${symbol.toUpperCase()}`,
        {
          params: {
            vs_currency: currency,
            days: days,
          },
        }
      )

      // Extract just the prices
      const prices = response.data.prices.map(([, price]) => price)

      this.cache.set(cacheKey, { data: prices, timestamp: Date.now() })
      console.log(`[PriceHistoryService] ✅ Got ${prices.length} price points for ${symbol}`)

      return prices
    } catch (error) {
      console.error(`[PriceHistoryService] ❌ Error fetching history for ${symbol}:`, error)
      return []
    }
  }

  /**
   * Get price history for multiple symbols (for correlation)
   */
  async getMultiplePriceHistory(
    symbols: string[],
    days: number = 30,
    currency: string = 'usd'
  ): Promise<Record<string, number[]>> {
    const result: Record<string, number[]> = {}

    // Fetch in parallel
    const promises = symbols.map(async symbol => {
      const prices = await this.getPriceHistory(symbol, days, currency)
      return { symbol, prices }
    })

    const results = await Promise.all(promises)

    for (const { symbol, prices } of results) {
      if (prices.length > 0) {
        result[symbol] = prices
      }
    }

    return result
  }

  /**
   * Get OHLCV data for technical indicators
   * Uses CoinGecko OHLC endpoint or generates from price history
   */
  async getOHLCV(symbol: string, days: number = 30): Promise<OHLCVData> {
    const cacheKey = `ohlcv_${symbol}_${days}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      console.log(`[PriceHistoryService] 📈 Fetching OHLCV for ${symbol}...`)

      // Try to get OHLC data from backend - note: symbol in path
      const response = await apiClient.get<any>(`/prices/ohlc/${symbol.toUpperCase()}`, {
        params: {
          days: days,
        },
      })

      if (response.data && response.data.length > 0) {
        // CoinGecko OHLC format: [timestamp, open, high, low, close]
        const ohlcv: OHLCVData = {
          timestamps: [],
          open: [],
          high: [],
          low: [],
          close: [],
          volume: [],
        }

        for (const candle of response.data) {
          ohlcv.timestamps.push(candle[0])
          ohlcv.open.push(candle[1])
          ohlcv.high.push(candle[2])
          ohlcv.low.push(candle[3])
          ohlcv.close.push(candle[4])
          // Volume not in OHLC endpoint, estimate from price movement
          ohlcv.volume.push(Math.abs(candle[4] - candle[1]) * 1000000)
        }

        this.cache.set(cacheKey, { data: ohlcv, timestamp: Date.now() })
        console.log(`[PriceHistoryService] ✅ Got ${ohlcv.close.length} candles for ${symbol}`)

        return ohlcv
      }

      // Fallback: Generate from price history
      return await this.generateOHLCVFromHistory(symbol, days)
    } catch (error_) {
      console.warn(
        `[PriceHistoryService] ⚠️ OHLC endpoint failed:`,
        error_,
        'generating from history'
      )
      return await this.generateOHLCVFromHistory(symbol, days)
    }
  }

  /**
   * Generate OHLCV from price history (fallback)
   */
  private async generateOHLCVFromHistory(symbol: string, days: number): Promise<OHLCVData> {
    try {
      const response = await apiClient.get<MarketChartData>(
        `/prices/history/${symbol.toUpperCase()}`,
        {
          params: {
            vs_currency: 'usd',
            days: days,
            interval: 'daily',
          },
        }
      )

      const prices = response.data.prices
      const volumes = response.data.total_volumes

      const ohlcv: OHLCVData = {
        timestamps: [],
        open: [],
        high: [],
        low: [],
        close: [],
        volume: [],
      }

      // Group hourly data into daily candles
      const dailyData = new Map<
        string,
        { prices: number[]; volumes: number[]; timestamp: number }
      >()

      for (let i = 0; i < prices.length; i++) {
        const pricePoint = prices[i]
        if (!pricePoint) continue

        const [timestamp, price] = pricePoint
        const dateStr = new Date(timestamp).toISOString().split('T')[0]
        if (!dateStr) continue

        if (!dailyData.has(dateStr)) {
          dailyData.set(dateStr, { prices: [], volumes: [], timestamp })
        }

        dailyData.get(dateStr)!.prices.push(price)
        const volumePoint = volumes[i]
        if (volumePoint) {
          dailyData.get(dateStr)!.volumes.push(volumePoint[1])
        }
      }

      // Convert to OHLCV
      for (const [, data] of dailyData) {
        const dayPrices = data.prices
        if (dayPrices.length === 0) continue

        ohlcv.timestamps.push(data.timestamp)
        ohlcv.open.push(dayPrices[0] ?? 0)
        ohlcv.high.push(Math.max(...dayPrices))
        ohlcv.low.push(Math.min(...dayPrices))
        ohlcv.close.push(dayPrices.at(-1) ?? 0)
        ohlcv.volume.push(data.volumes.reduce((a, b) => a + b, 0) || 0)
      }

      console.log(`[PriceHistoryService] ✅ Generated ${ohlcv.close.length} candles from history`)
      return ohlcv
    } catch (error) {
      console.error(`[PriceHistoryService] ❌ Error generating OHLCV:`, error)
      return { timestamps: [], open: [], high: [], low: [], close: [], volume: [] }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

export const priceHistoryService = new PriceHistoryService()
export default priceHistoryService
