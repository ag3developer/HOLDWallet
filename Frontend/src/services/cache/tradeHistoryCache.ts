/**
 * 📦 Trade History Cache - HOLD Wallet
 * =====================================
 *
 * Cache para histórico de trades para evitar recarregamentos desnecessários.
 * Usa localStorage com TTL (Time To Live) para persistência.
 *
 * @version 1.0.0
 */

// ============================================================================
// TIPOS
// ============================================================================

interface Trade {
  id: string
  reference_code: string
  operation: 'buy' | 'sell'
  symbol: string
  name?: string
  crypto_amount: number
  fiat_amount: number
  total_amount: number
  spread_percentage: number
  network_fee_percentage: number
  payment_method: string
  status: 'PENDING' | 'PAYMENT_CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'FAILED'
  created_at: string
  updated_at?: string
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  userId?: string | undefined
}

interface TradeHistoryCache {
  trades: Trade[]
  total: number
  page: number
  per_page: number
}

// ============================================================================
// CONSTANTES
// ============================================================================

const CACHE_KEY = 'hold_trade_history_cache'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos
const TRADE_DETAILS_CACHE_KEY = 'hold_trade_details_cache'
const TRADE_DETAILS_TTL_MS = 2 * 60 * 1000 // 2 minutos para detalhes

// ============================================================================
// CACHE MANAGER
// ============================================================================

class TradeHistoryCacheManager {
  private static instance: TradeHistoryCacheManager
  private readonly memoryCache: Map<string, CacheEntry<unknown>> = new Map()

  private constructor() {
    // Carregar cache do localStorage para memória
    this.loadFromStorage()
  }

  static getInstance(): TradeHistoryCacheManager {
    if (!TradeHistoryCacheManager.instance) {
      TradeHistoryCacheManager.instance = new TradeHistoryCacheManager()
    }
    return TradeHistoryCacheManager.instance
  }

  /**
   * Carrega cache do localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(CACHE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.memoryCache.set(CACHE_KEY, parsed)
      }

      // Carregar cache de detalhes
      const detailsStored = localStorage.getItem(TRADE_DETAILS_CACHE_KEY)
      if (detailsStored) {
        const detailsParsed = JSON.parse(detailsStored) as Record<string, CacheEntry<unknown>>
        Object.entries(detailsParsed).forEach(([key, value]) => {
          this.memoryCache.set(key, value)
        })
      }
    } catch (error) {
      console.warn('[TradeCache] Failed to load from storage:', error)
    }
  }

  /**
   * Salva cache no localStorage
   */
  private saveToStorage(): void {
    try {
      const historyEntry = this.memoryCache.get(CACHE_KEY)
      if (historyEntry) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(historyEntry))
      }

      // Salvar cache de detalhes
      const detailsCache: Record<string, CacheEntry<unknown>> = {}
      this.memoryCache.forEach((value, key) => {
        if (key.startsWith('trade_detail_')) {
          detailsCache[key] = value
        }
      })
      if (Object.keys(detailsCache).length > 0) {
        localStorage.setItem(TRADE_DETAILS_CACHE_KEY, JSON.stringify(detailsCache))
      }
    } catch (error) {
      console.warn('[TradeCache] Failed to save to storage:', error)
    }
  }

  /**
   * Verifica se o cache é válido (não expirou)
   */
  private isValid(entry: CacheEntry<unknown> | undefined, ttl: number): boolean {
    if (!entry) return false
    return Date.now() - entry.timestamp < ttl
  }

  /**
   * Obtém histórico de trades do cache
   */
  getTradeHistory(userId?: string): TradeHistoryCache | null {
    const entry = this.memoryCache.get(CACHE_KEY)

    if (!this.isValid(entry, CACHE_TTL_MS)) {
      console.log('[TradeCache] Cache expired or not found')
      return null
    }

    // Verificar se é do mesmo usuário
    if (userId && entry?.userId !== userId) {
      console.log('[TradeCache] Cache belongs to different user')
      return null
    }

    console.log('[TradeCache] Cache hit - returning cached trades')
    return entry?.data as TradeHistoryCache
  }

  /**
   * Salva histórico de trades no cache
   */
  setTradeHistory(data: TradeHistoryCache, userId?: string): void {
    const entry: CacheEntry<TradeHistoryCache> = {
      data,
      timestamp: Date.now(),
      userId,
    }
    this.memoryCache.set(CACHE_KEY, entry)
    this.saveToStorage()
    console.log('[TradeCache] Trade history cached:', data.trades.length, 'trades')
  }

  /**
   * Obtém detalhes de uma trade específica do cache
   */
  getTradeDetails(tradeId: string): unknown {
    const key = `trade_detail_${tradeId}`
    const entry = this.memoryCache.get(key)

    if (!this.isValid(entry, TRADE_DETAILS_TTL_MS)) {
      return null
    }

    console.log('[TradeCache] Trade details cache hit:', tradeId)
    return entry?.data
  }

  /**
   * Salva detalhes de uma trade no cache
   */
  setTradeDetails(tradeId: string, data: unknown): void {
    const key = `trade_detail_${tradeId}`
    const entry: CacheEntry<unknown> = {
      data,
      timestamp: Date.now(),
    }
    this.memoryCache.set(key, entry)
    this.saveToStorage()
    console.log('[TradeCache] Trade details cached:', tradeId)
  }

  /**
   * Invalida o cache de histórico (força reload)
   */
  invalidateHistory(): void {
    this.memoryCache.delete(CACHE_KEY)
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch {
      console.debug('[TradeCache] localStorage not available')
    }
    console.log('[TradeCache] History cache invalidated')
  }

  /**
   * Invalida cache de uma trade específica
   */
  invalidateTradeDetails(tradeId: string): void {
    const key = `trade_detail_${tradeId}`
    this.memoryCache.delete(key)
    console.log('[TradeCache] Trade details cache invalidated:', tradeId)
  }

  /**
   * Adiciona uma nova trade ao cache (sem invalidar tudo)
   */
  addTradeToCache(trade: Trade, userId?: string): void {
    const entry = this.memoryCache.get(CACHE_KEY)
    if (entry && this.isValid(entry, CACHE_TTL_MS)) {
      const data = entry.data as TradeHistoryCache
      // Adiciona no início (mais recente)
      data.trades.unshift(trade)
      data.total += 1
      entry.timestamp = Date.now()
      this.saveToStorage()
      console.log('[TradeCache] New trade added to cache:', trade.reference_code)
    }
  }

  /**
   * Atualiza status de uma trade no cache
   */
  updateTradeStatus(tradeId: string, newStatus: Trade['status']): void {
    const entry = this.memoryCache.get(CACHE_KEY)
    if (entry) {
      const data = entry.data as TradeHistoryCache
      const trade = data.trades.find(t => t.id === tradeId)
      if (trade) {
        trade.status = newStatus
        trade.updated_at = new Date().toISOString()
        this.saveToStorage()
        console.log('[TradeCache] Trade status updated in cache:', tradeId, newStatus)
      }
    }

    // Também invalidar detalhes para forçar reload
    this.invalidateTradeDetails(tradeId)
  }

  /**
   * Remove completamente o cache de trades do localStorage e memória
   */
  clearAll(): void {
    this.memoryCache.clear()
    try {
      localStorage.removeItem(CACHE_KEY)
      localStorage.removeItem(TRADE_DETAILS_CACHE_KEY)
    } catch {
      console.debug('[TradeCache] localStorage not available')
    }
    console.log('[TradeCache] All cache cleared')
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): { historyAge: number | null; detailsCount: number } {
    const historyEntry = this.memoryCache.get(CACHE_KEY)
    const historyAge = historyEntry ? Date.now() - historyEntry.timestamp : null

    let detailsCount = 0
    this.memoryCache.forEach((_, key) => {
      if (key.startsWith('trade_detail_')) {
        detailsCount++
      }
    })

    return { historyAge, detailsCount }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const tradeHistoryCache = TradeHistoryCacheManager.getInstance()

export default tradeHistoryCache
