/**
 * Serviço de cache global para preços de criptomoedas
 * Armazena em localStorage para persistência entre navegações
 */

interface CachedPrice {
  price: number
  change_24h: number
  high_24h: number
  low_24h: number
  timestamp: number
  currency: string
}

interface PriceCacheEntry {
  [symbol: string]: CachedPrice
}

interface CacheData {
  version: number
  entries: Record<string, PriceCacheEntry>
}

const CACHE_KEY = 'crypto_prices_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos
const CACHE_VERSION = 5 // v5: Limpeza do cache com preços zerados

class PriceCache {
  private static getCache(): Record<string, PriceCacheEntry> {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return {}

      const data = JSON.parse(cached)

      // Verificar se é formato antigo (sem version) ou versão desatualizada
      if (!data.version || data.version < CACHE_VERSION) {
        console.log('[PriceCache] Cache version outdated, clearing...')
        localStorage.removeItem(CACHE_KEY)
        return {}
      }

      return data.entries || {}
    } catch {
      return {}
    }
  }

  private static setCache(entries: Record<string, PriceCacheEntry>) {
    try {
      const data: CacheData = {
        version: CACHE_VERSION,
        entries,
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('[PriceCache] Failed to save cache to localStorage:', e)
    }
  }

  /**
   * Obter preços em cache para uma moeda
   */
  static getPrice(symbol: string, currency: string = 'USD'): CachedPrice | null {
    const cache = this.getCache()
    const currencyKey = currency.toUpperCase()
    const symbolUpper = symbol.toUpperCase()

    const entry = cache[currencyKey]?.[symbolUpper]

    // Se existe e ainda é válido (não expirou)
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      console.log(`[PriceCache] Cache hit for ${symbolUpper} in ${currencyKey}:`, entry.price)
      return entry
    }

    return null
  }

  /**
   * Obter múltiplos preços em cache
   */
  static getPrices(
    symbols: string[],
    currency: string = 'USD'
  ): Record<string, CachedPrice | null> {
    const result: Record<string, CachedPrice | null> = {}
    for (const symbol of symbols) {
      result[symbol.toUpperCase()] = this.getPrice(symbol, currency)
    }
    return result
  }

  /**
   * Cachear preço com dados completos
   * ⚠️ NÃO cacheia preços zerados para evitar dados inválidos
   */
  static setPrice(
    symbol: string,
    price: number,
    currency: string = 'USD',
    change_24h: number = 0,
    high_24h: number = 0,
    low_24h: number = 0
  ) {
    // Não cachear preços zerados ou inválidos
    if (!price || price <= 0) {
      console.log(`[PriceCache] Skipping cache for ${symbol} - invalid price: ${price}`)
      return
    }

    const cache = this.getCache()
    const currencyKey = currency.toUpperCase()
    const symbolUpper = symbol.toUpperCase()

    cache[currencyKey] ??= {}

    cache[currencyKey][symbolUpper] = {
      price,
      change_24h,
      high_24h,
      low_24h,
      timestamp: Date.now(),
      currency: currencyKey,
    }

    this.setCache(cache)
    console.log(
      `[PriceCache] Cached ${symbolUpper} = ${price} ${currencyKey} (change: ${change_24h.toFixed(2)}%)`
    )
  }

  /**
   * Cachear múltiplos preços com dados completos
   */
  static setPrices(
    prices: Record<
      string,
      { price: number; change_24h?: number; high_24h?: number; low_24h?: number }
    >,
    currency: string = 'USD'
  ) {
    for (const [symbol, data] of Object.entries(prices)) {
      this.setPrice(
        symbol,
        data.price,
        currency,
        data.change_24h || 0,
        data.high_24h || 0,
        data.low_24h || 0
      )
    }
  }

  /**
   * Limpar cache (opcional)
   */
  static clear() {
    try {
      localStorage.removeItem(CACHE_KEY)
      console.log('[PriceCache] Cache cleared')
    } catch (e) {
      console.warn('[PriceCache] Failed to clear cache:', e)
    }
  }

  /**
   * Obter status do cache
   */
  static getStatus(currency: string = 'USD'): { cached: number; expired: number } {
    const cache = this.getCache()
    const currencyKey = currency.toUpperCase()
    const entries = cache[currencyKey] || {}
    const now = Date.now()

    let cached = 0
    let expired = 0

    for (const entry of Object.values(entries)) {
      if (now - entry.timestamp < CACHE_TTL) {
        cached++
      } else {
        expired++
      }
    }

    return { cached, expired }
  }
}

export default PriceCache
