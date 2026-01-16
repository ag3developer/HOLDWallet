/**
 * 🏦 HOLD Wallet - Price Service (Real-Time Trading)
 * ==================================================
 *
 * Serviço centralizado de preços de criptomoedas.
 *
 * 📐 PADRÃO TRADING EM TEMPO REAL:
 * ─────────────────────────────────
 * 1. Backend → Retorna preços na moeda solicitada (USD, BRL, EUR)
 * 2. Fonte primária → Binance (preços mais precisos)
 * 3. Fallback → CoinGecko (se Binance falhar)
 * 4. ⚠️ SEM CACHE → Preços sempre frescos para evitar prejuízos
 * 5. Deduplicação → Requisições em paralelo são mescladas
 *
 * @version 4.0.0 - Suporte multi-moeda via backend
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
   * Respeita o parâmetro currency para buscar na moeda correta
   * ⚠️ SEM FALLBACK - Retorna erro se backend indisponível para evitar preços incorretos
   */
  private static async fetchFromBackend(
    symbols: string[],
    currency: string = 'USD'
  ): Promise<PriceData> {
    if (symbols.length === 0) return {}

    const symbolsQuery = symbols.join(',')
    // Usar a moeda solicitada (USD, BRL, EUR, etc.)
    const currencyCode = currency.toLowerCase()

    const client = axios.create({
      baseURL: APP_CONFIG.api.baseUrl,
      timeout: 20000, // 20s timeout - servidor pode ser lento
      headers: { 'Content-Type': 'application/json' },
    })

    try {
      console.log(
        `[PriceService] Fetching from /prices/batch: ${symbolsQuery.substring(0, 50)}... (in ${currency.toUpperCase()})`
      )
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

      console.warn('[PriceService] ⚠️ Response has no prices')
      return {}
    } catch (error: unknown) {
      // Tratamento silencioso para erros comuns
      if (axios.isAxiosError(error)) {
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout')
        const isNetwork = error.code === 'ERR_NETWORK' || !error.response

        if (isTimeout) {
          console.warn('[PriceService] ⏱️ Timeout fetching prices - server may be slow')
        } else if (isNetwork) {
          console.warn('[PriceService] 🌐 Network error fetching prices - server may be offline')
        } else {
          console.warn(`[PriceService] ⚠️ Error fetching prices (${error.response?.status})`)
        }
      } else {
        console.warn('[PriceService] ⚠️ Error fetching prices')
      }
      // ⚠️ SEM FALLBACK - Retorna vazio para evitar preços incorretos em trading
      return {}
    }
  }

  /**
   * Parse resposta do backend
   *
   * Retorna preços na moeda solicitada (USD, BRL, EUR, etc.)
   * O backend já faz a conversão via Binance/CoinGecko
   */
  private static parseResponse(data: Record<string, any>): PriceData {
    const result: PriceData = {}

    for (const [symbol, info] of Object.entries(data)) {
      const symbolUpper = symbol.toUpperCase()
      const infoObj = info as Record<string, any>

      // Preço na moeda solicitada
      const price = infoObj.price || infoObj.value || 0

      result[symbolUpper] = {
        price: price,
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
