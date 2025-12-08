/**
 * Market Price Service
 * Busca preços reais de criptomoedas da CoinGecko API (gratuita e sem restrições)
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
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3'
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
   * Busca o preço atual de uma criptomoeda via CoinGecko API (Gratuita)
   */
  async getPrice(symbol: string): Promise<CryptoPriceData | null> {
    try {
      // Verificar cache
      const cacheKey = symbol.toUpperCase()
      const cached = this.priceCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data
      }

      // Converter símbolo para ID do CoinGecko
      const coingeckoId = this.symbolToCoingeckoId[symbol.toUpperCase()]
      if (!coingeckoId) {
        console.warn(`Símbolo não mapeado: ${symbol}`)
        return null
      }

      // Chamar CoinGecko API
      const response = await fetch(
        `${this.COINGECKO_API}/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_24hr_change=true`
      )

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      const priceData = data[coingeckoId]

      if (!priceData?.usd) {
        console.warn(`Dados inválidos para ${symbol}`)
        return null
      }

      // Extrair dados da resposta do CoinGecko
      const price = Number(priceData.usd || 0)
      const change24h = Number(priceData.usd_24h_change || 0)

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
   * Converte símbolo para nome amigável
   */
  private getNameFromSymbol(symbol: string): string {
    const names: Record<string, string> = {
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
    return names[symbol.toUpperCase()] || symbol
  }

  /**
   * Limpa o cache
   */
  clearCache(): void {
    this.priceCache.clear()
  }
}

export const marketPriceService = new MarketPriceService()
