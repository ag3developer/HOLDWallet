/**
 * Serviço centralizado de preços
 * Gerencia requisições e cache para evitar rate limiting
 */

import axios from 'axios'
import { APP_CONFIG } from '@/config/app'
import PriceCache from './price-cache'

interface PriceData {
  [symbol: string]: {
    price: number
    change_24h?: number
    high_24h?: number
    low_24h?: number
  }
}

class PriceService {
  private static readonly requestQueue: Map<string, Promise<PriceData>> = new Map()
  private static readonly lastRequestTime: Map<string, number> = new Map()
  private static readonly MIN_REQUEST_INTERVAL = 5000 // 5 segundos entre requisições para o mesmo símbolo

  /**
   * Buscar preço com deduplicação de requisições
   * Se já existe uma requisição em andamento para o mesmo símbolo, retorna a promise existente
   */
  static async getPrice(
    symbol: string,
    currency: string = 'USD'
  ): Promise<{ price: number; change_24h?: number }> {
    const symbolUpper = symbol.toUpperCase()
    const currencyUpper = currency.toUpperCase()
    const cacheKey = `${symbolUpper}_${currencyUpper}`

    // Tentar cache primeiro
    const cached = PriceCache.getPrice(symbolUpper, currency)
    if (cached) {
      console.log(`[PriceService] Cache hit for ${symbolUpper}:`, cached.price)
      return { price: cached.price, change_24h: 0 }
    }

    // Verificar se já há requisição em andamento
    if (this.requestQueue.has(cacheKey)) {
      console.log(`[PriceService] Request in progress for ${symbolUpper}, waiting...`)
      const result = await this.requestQueue.get(cacheKey)!
      return result?.[symbolUpper] || { price: 0 }
    }

    // Verificar intervalo mínimo entre requisições
    const lastTime = this.lastRequestTime.get(cacheKey) || 0
    if (Date.now() - lastTime < this.MIN_REQUEST_INTERVAL) {
      console.log(
        `[PriceService] Rate limit: waiting ${this.MIN_REQUEST_INTERVAL}ms between requests`
      )
      await new Promise(resolve =>
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - (Date.now() - lastTime))
      )
    }

    // Criar nova requisição
    const requestPromise = this.fetchFromBackend([symbolUpper], currency).then(data => {
      this.requestQueue.delete(cacheKey)
      this.lastRequestTime.set(cacheKey, Date.now())
      return data
    })

    this.requestQueue.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      return result?.[symbolUpper] || { price: 0 }
    } catch (error) {
      console.error(`[PriceService] Error fetching price for ${symbolUpper}:`, error)
      return { price: 0 }
    }
  }

  /**
   * Buscar múltiplos preços em uma única requisição
   */
  static async getPrices(symbols: string[], currency: string = 'USD'): Promise<PriceData> {
    const symbolsUpper = symbols.map(s => s.toUpperCase())

    // Separar em cached e não-cached
    const cached: PriceData = {}
    const needsFetch: string[] = []

    for (const symbol of symbolsUpper) {
      const cachedPrice = PriceCache.getPrice(symbol, currency)
      if (cachedPrice) {
        cached[symbol] = { price: cachedPrice.price }
      } else {
        needsFetch.push(symbol)
      }
    }

    // Se todos estão em cache, retornar imediatamente
    if (needsFetch.length === 0) {
      console.log('[PriceService] All prices in cache, returning immediately')
      return cached
    }

    // Se precisa buscar, fazer requisição para os símbolos faltando
    console.log(`[PriceService] Fetching ${needsFetch.length} prices from backend`)
    const fetched = await this.fetchFromBackend(needsFetch, currency)

    // Combinar cached + fetched
    return { ...cached, ...fetched }
  }

  /**
   * Buscar preços do backend
   * Usa apenas o endpoint /prices/batch (único endpoint funcional)
   * SEMPRE busca em USD - conversão para outra moeda é feita no frontend
   */
  private static async fetchFromBackend(
    symbols: string[],
    currency: string = 'USD'
  ): Promise<PriceData> {
    if (symbols.length === 0) return {}

    const symbolsQuery = symbols.join(',')
    // SEMPRE usar USD - conversão será feita no frontend
    const currencyCode = 'usd'

    const client = axios.create({
      baseURL: APP_CONFIG.api.baseUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    })

    try {
      console.log(`[PriceService] Fetching from /prices/batch: ${symbolsQuery} (in USD)`)
      const response = await client.get('/prices/batch', {
        params: {
          symbols: symbolsQuery,
          fiat: currencyCode,
        },
      })

      const data = response.data
      if (data.prices && typeof data.prices === 'object') {
        const result = this.parseResponse(data.prices, currency)
        console.log('[PriceService] Prices fetched successfully:', result)
        this.cacheResults(result, currency)
        return result
      }

      console.warn('[PriceService] Response has no prices:', data)
      return {}
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error(
          `[PriceService] Failed to fetch prices (${error.response?.status}):`,
          error.message
        )
      } else {
        console.error('[PriceService] Failed to fetch prices:', error)
      }
      return {}
    }
  }

  /**
   * Parse resposta do backend
   */
  private static parseResponse(data: Record<string, any>, currency: string): PriceData {
    const result: PriceData = {}

    for (const [symbol, info] of Object.entries(data)) {
      const symbolUpper = symbol.toUpperCase()
      const infoObj = info as Record<string, any>

      result[symbolUpper] = {
        price: infoObj.price || infoObj.value || 0,
        change_24h: infoObj.change_24h || 0,
        high_24h: infoObj.high_24h || 0,
        low_24h: infoObj.low_24h || 0,
      }
    }

    return result
  }

  /**
   * Cachear resultados
   */
  private static cacheResults(data: PriceData, currency: string) {
    for (const [symbol, priceData] of Object.entries(data)) {
      PriceCache.setPrice(symbol, priceData.price, currency)
    }
  }

  /**
   * Limpar cache (útil para testes)
   */
  static clearCache() {
    PriceCache.clear()
    this.requestQueue.clear()
    this.lastRequestTime.clear()
  }

  /**
   * Obter status
   */
  static getStatus() {
    return {
      queuedRequests: this.requestQueue.size,
      lastRequests: Array.from(this.lastRequestTime.entries()),
    }
  }
}

export default PriceService
