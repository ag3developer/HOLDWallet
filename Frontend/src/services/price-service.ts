/**
 * 🏦 HOLD Wallet - Price Service (Real-Time Trading)
 * ==================================================
 *
 * Serviço centralizado de preços de criptomoedas.
 *
 * 📐 PADRÃO TRADING EM TEMPO REAL:
 * ─────────────────────────────────
 * 1. Backend → SEMPRE retorna preços em USD
 * 2. Conversão → Feita via CurrencyManager centralizado
 * 3. ⚠️ SEM CACHE → Preços sempre frescos para evitar prejuízos
 * 4. Deduplicação → Requisições em paralelo são mescladas
 *
 * @version 3.0.0 - Removido cache para trading em tempo real
 * @enterprise true
 */

import axios from 'axios'
import { APP_CONFIG } from '@/config/app'

interface PriceData {
  [symbol: string]: {
    price: number
    change_24h?: number
    high_24h?: number
    low_24h?: number
  }
}

class PriceService {
  // Apenas deduplicação de requisições em paralelo (sem cache!)
  private static readonly requestQueue: Map<string, Promise<PriceData>> = new Map()

  /**
   * Buscar preço com deduplicação de requisições
   * Se já existe uma requisição em andamento para o mesmo símbolo, retorna a promise existente
   * ⚠️ SEM CACHE - Sempre busca do backend
   */
  static async getPrice(
    symbol: string,
    currency: string = 'USD'
  ): Promise<{ price: number; change_24h?: number }> {
    const symbolUpper = symbol.toUpperCase()
    const currencyUpper = currency.toUpperCase()
    const cacheKey = `${symbolUpper}_${currencyUpper}`

    // Verificar se já há requisição em andamento (deduplicação)
    if (this.requestQueue.has(cacheKey)) {
      console.log(`[PriceService] Request in progress for ${symbolUpper}, waiting...`)
      const result = await this.requestQueue.get(cacheKey)!
      return result?.[symbolUpper] || { price: 0 }
    }

    // Criar nova requisição
    const requestPromise = this.fetchFromBackend([symbolUpper], currency).then(data => {
      this.requestQueue.delete(cacheKey)
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
   * ⚠️ SEM CACHE - Sempre busca do backend para preços em tempo real
   */
  static async getPrices(symbols: string[], currency: string = 'USD'): Promise<PriceData> {
    const symbolsUpper = symbols.map(s => s.toUpperCase())
    const batchKey = `batch_${symbolsUpper.join(',')}_${currency}`

    // Deduplicação: se já há requisição em andamento para os mesmos símbolos, aguardar
    if (this.requestQueue.has(batchKey)) {
      console.log(`[PriceService] Batch request in progress, waiting...`)
      return this.requestQueue.get(batchKey)!
    }

    // Criar nova requisição
    console.log(`[PriceService] 🔄 Fetching LIVE prices for ${symbolsUpper.length} symbols`)
    const requestPromise = this.fetchFromBackend(symbolsUpper, currency).then(data => {
      this.requestQueue.delete(batchKey)
      return data
    })

    this.requestQueue.set(batchKey, requestPromise)

    try {
      return await requestPromise
    } catch (error) {
      this.requestQueue.delete(batchKey)
      throw error
    }
  }

  /**
   * Buscar preços do backend
   * Usa apenas o endpoint /prices/batch (único endpoint funcional)
   * SEMPRE busca em USD - conversão para outra moeda é feita no frontend
   * ⚠️ SEM FALLBACK - Retorna erro se backend indisponível para evitar preços incorretos
   */
  private static async fetchFromBackend(
    symbols: string[],
    _currency: string = 'USD'
  ): Promise<PriceData> {
    if (symbols.length === 0) return {}

    const symbolsQuery = symbols.join(',')
    // SEMPRE usar USD - conversão será feita no frontend
    const currencyCode = 'usd'

    const client = axios.create({
      baseURL: APP_CONFIG.api.baseUrl,
      timeout: 20000, // 20s timeout - maior tolerância
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
        const result = this.parseResponse(data.prices)
        console.log('[PriceService] ✅ Live prices fetched:', Object.keys(result).length, 'symbols')
        return result
      }

      console.warn('[PriceService] ⚠️ Response has no prices:', data)
      return {}
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error(
          `[PriceService] ❌ Failed to fetch prices (${error.response?.status}):`,
          error.message
        )
      } else {
        console.error('[PriceService] ❌ Failed to fetch prices:', error)
      }
      // ⚠️ SEM FALLBACK - Retorna vazio para evitar preços incorretos em trading
      return {}
    }
  }

  /**
   * Parse resposta do backend
   *
   * ⚠️ PADRÃO TRADING: Retorna preços em USD!
   * A conversão para moeda do usuário é feita pelo formatCurrency() na exibição.
   * Isso evita conversão dupla e mantém consistência.
   */
  private static parseResponse(data: Record<string, any>): PriceData {
    const result: PriceData = {}

    for (const [symbol, info] of Object.entries(data)) {
      const symbolUpper = symbol.toUpperCase()
      const infoObj = info as Record<string, any>

      // Preço em USD (sem conversão)
      const priceUSD = infoObj.price || infoObj.value || 0

      result[symbolUpper] = {
        price: priceUSD, // Mantém em USD!
        change_24h: infoObj.change_24h || 0,
        high_24h: infoObj.high_24h || 0,
        low_24h: infoObj.low_24h || 0,
      }
    }

    return result
  }

  /**
   * Limpar requisições em andamento (útil para testes)
   */
  static clearPendingRequests() {
    this.requestQueue.clear()
  }

  /**
   * Obter status do serviço
   */
  static getStatus() {
    return {
      pendingRequests: this.requestQueue.size,
    }
  }
}

export default PriceService
