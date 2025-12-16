/**
 * Serviço para buscar taxas de câmbio em tempo real
 * Usa API gratuita exchangerate-api.com
 */

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD'
const CACHE_KEY = 'exchange_rates_cache'
const CACHE_DURATION = 60 * 60 * 1000 // 1 hora

interface ExchangeRatesResponse {
  base: string
  date: string
  rates: Record<string, number>
}

interface CachedRates {
  rates: Record<string, number>
  timestamp: number
}

export const exchangeRateApi = {
  /**
   * Busca taxas de câmbio em tempo real da API
   * Com cache de 1 hora para evitar excesso de chamadas
   */
  async fetchRealRates(): Promise<Record<string, number>> {
    try {
      // Tentar usar cache primeiro
      const cached = this.getCachedRates()
      if (cached) {
        console.log('[ExchangeRate] Using cached rates:', cached)
        return cached
      }

      console.log('[ExchangeRate] Fetching fresh rates from API...')
      const response = await fetch(EXCHANGE_RATE_API)

      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rates: ${response.status}`)
      }

      const data: ExchangeRatesResponse = await response.json()
      console.log('[ExchangeRate] Fresh rates fetched:', data.rates)

      // Extrair apenas as moedas que usamos
      const rates = {
        USD: 1, // Base currency
        BRL: data.rates.BRL || 6, // Fallback
        EUR: data.rates.EUR || 0.92, // Fallback
      }

      // Salvar no cache
      this.setCachedRates(rates)

      return rates
    } catch (error) {
      console.error('[ExchangeRate] Error fetching rates:', error)
      // Retornar taxas padrão em caso de erro
      return this.getFallbackRates()
    }
  },

  /**
   * Obtém taxas do localStorage se ainda válidas
   */
  getCachedRates(): Record<string, number> | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null

      const { rates, timestamp }: CachedRates = JSON.parse(cached)
      const now = Date.now()

      // Verificar se cache ainda é válido (< 1 hora)
      if (now - timestamp < CACHE_DURATION) {
        return rates
      }

      // Cache expirado
      return null
    } catch (error) {
      console.error('[ExchangeRate] Error reading cache:', error)
      return null
    }
  },

  /**
   * Salva taxas no localStorage
   */
  setCachedRates(rates: Record<string, number>): void {
    try {
      const cached: CachedRates = {
        rates,
        timestamp: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
      console.log('[ExchangeRate] Rates cached successfully')
    } catch (error) {
      console.error('[ExchangeRate] Error caching rates:', error)
    }
  },

  /**
   * Taxas de fallback caso API falhe
   */
  getFallbackRates(): Record<string, number> {
    console.warn('[ExchangeRate] Using fallback rates')
    return {
      USD: 1,
      BRL: 6, // Taxa aproximada de dez/2024
      EUR: 0.92,
    }
  },

  /**
   * Limpa o cache (útil para testes)
   */
  clearCache(): void {
    localStorage.removeItem(CACHE_KEY)
    console.log('[ExchangeRate] Cache cleared')
  },

  /**
   * Força atualização das taxas (ignora cache)
   */
  async forceRefresh(): Promise<Record<string, number>> {
    this.clearCache()
    return this.fetchRealRates()
  },
}
