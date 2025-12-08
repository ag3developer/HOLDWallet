/**
 * Market Price Service
 * Busca preços via backend proxy para evitar CORS issues
 */

interface CryptoPriceData {
  symbol: string
  name: string
  price: number
  priceUSD: string
  change24h: number
  change24hPercent: string
  updatedAt: Date
}

class MarketPriceService {
  private readonly BACKEND_API = 'http://127.0.0.1:8000'
  private readonly priceCache: Map<string, { data: CryptoPriceData; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  // Mapa de símbolos para IDs do CoinGecko
  private readonly symbolToCoingeckoId: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    USDT: 'tether',
    USDC: 'usd-coin',
    XRP: 'ripple',
    ADA: 'cardano',
    SOL: 'solana',
    DOT: 'polkadot',
    LINK: 'chainlink',
    MATIC: 'matic-network',
    BNB: 'binancecoin',
    LTC: 'litecoin',
    DOGE: 'dogecoin',
    AVAX: 'avalanche-2',
    SHIB: 'shiba-inu',
  }

  /**
   * Busca o preço atual via backend proxy (sem CORS issues)
   */
  async getPrice(symbol: string): Promise<CryptoPriceData | null> {
    try {
      // Verificar cache
      const cacheKey = symbol.toUpperCase()
      const cached = this.priceCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data
      }

      // Chamar backend proxy endpoint
      const response = await fetch(
        `${this.BACKEND_API}/prices/market/price?symbol=${symbol.toUpperCase()}&fiat=usd`,
        {
          headers: {
            Authorization: `Bearer ${this.getTokenFromStorage()}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      const price = Number(data.price || 0)
      const change24h = Number(data.change_24h || 0)

      const result: CryptoPriceData = {
        symbol: symbol.toUpperCase(),
        name: this.getNameFromSymbol(symbol),
        price: price,
        priceUSD: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: price < 1 ? 6 : 2,
          maximumFractionDigits: price < 1 ? 6 : 2,
        }).format(price),
        change24h: change24h,
        change24hPercent: `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`,
        updatedAt: new Date(),
      }

      // Cachear resultado
      this.priceCache.set(cacheKey, { data: result, timestamp: Date.now() })

      return result
    } catch (error) {
      console.error(`Erro ao buscar preço de ${symbol}:`, error)
      return null
    }
  }

  /**
   * Busca preços de múltiplas criptomoedas
   */
  async getPrices(symbols: string[]): Promise<CryptoPriceData[]> {
    try {
      const results: CryptoPriceData[] = []

      for (const symbol of symbols) {
        const priceData = await this.getPrice(symbol)
        if (priceData) {
          results.push(priceData)
        }
      }

      return results
    } catch (error) {
      console.error('Erro ao buscar preços:', error)
      return []
    }
  }

  /**
   * Obtém token do localStorage
   */
  private getTokenFromStorage(): string {
    try {
      const authState = localStorage.getItem('auth-storage')
      if (authState) {
        const parsed = JSON.parse(authState)
        return parsed.state?.token || ''
      }
    } catch (e) {
      console.error('Erro ao ler token:', e)
    }
    return ''
  }

  /**
   * Limpa o cache
   */
  clearCache(): void {
    this.priceCache.clear()
  }
}

export const marketPriceService = new MarketPriceService()
