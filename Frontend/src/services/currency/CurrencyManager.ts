/**
 * 🏦 HOLD Wallet - Currency Manager (Enterprise Grade)
 * =====================================================
 *
 * Sistema centralizado de gerenciamento de moedas e conversões.
 *
 * 📐 PADRÃO ENTERPRISE:
 * ─────────────────────
 * 1. Backend → SEMPRE retorna valores em USD (moeda base)
 * 2. Frontend → Converte USD → moeda do usuário usando taxas reais
 * 3. Cache → Versionado, separado por moeda, com TTL
 * 4. Taxas → Atualizadas via API real (exchangerate-api.com)
 * 5. Fallback → Taxas padrão em caso de erro de rede
 *
 * ⚠️ NUNCA armazenar valores já convertidos no banco de dados!
 * ⚠️ SEMPRE fazer conversão no momento da exibição!
 *
 * @version 2.0.0
 * @enterprise true
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type SupportedCurrency = 'USD' | 'BRL' | 'EUR'

export type RateSource = 'api' | 'cache' | 'fallback'

export interface ExchangeRate {
  from: SupportedCurrency
  to: SupportedCurrency
  rate: number
  timestamp: number
  source: RateSource
}

export interface ConversionResult {
  originalValue: number
  originalCurrency: SupportedCurrency
  convertedValue: number
  targetCurrency: SupportedCurrency
  rate: number
  rateSource: RateSource
  timestamp: number
}

interface CachedRates {
  version: number
  rates: Record<string, number>
  timestamp: number
  source: RateSource
}

// ============================================================================
// CONSTANTES
// ============================================================================

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD'
const CACHE_KEY = 'currency_manager_rates_v2'
const CACHE_VERSION = 2
const CACHE_TTL = 60 * 60 * 1000 // 1 hora
const STALE_TTL = 24 * 60 * 60 * 1000 // 24 horas (usa stale se API falhar)

// Taxas de fallback conservadoras (atualizadas em Jan/2026)
const FALLBACK_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  BRL: 6.1, // Taxa conservadora
  EUR: 0.92,
}

// ============================================================================
// CURRENCY MANAGER CLASS
// ============================================================================

class CurrencyManager {
  private static instance: CurrencyManager
  private rates: Record<string, number> = { ...FALLBACK_RATES }
  private rateSource: RateSource = 'fallback'
  private lastUpdate: number = 0
  private initPromise: Promise<void> | null = null
  private readonly listeners: Set<(rates: Record<string, number>) => void> = new Set()

  private constructor() {
    // Singleton - usar getInstance()
  }

  /**
   * Obtém instância única do CurrencyManager (Singleton)
   */
  static getInstance(): CurrencyManager {
    if (!CurrencyManager.instance) {
      CurrencyManager.instance = new CurrencyManager()
    }
    return CurrencyManager.instance
  }

  /**
   * Inicializa o manager carregando taxas
   * Chamado automaticamente na primeira conversão
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this.loadRates()
    await this.initPromise
  }

  /**
   * Carrega taxas de câmbio (cache → API → fallback)
   */
  private async loadRates(): Promise<void> {
    console.log('[CurrencyManager] 🏦 Initializing...')

    // 1. Tentar cache primeiro
    const cached = this.loadFromCache()
    if (cached && this.isCacheValid(cached)) {
      this.rates = cached.rates
      this.rateSource = 'cache'
      this.lastUpdate = cached.timestamp
      console.log('[CurrencyManager] ✅ Using cached rates:', this.rates)

      // Se cache está próximo de expirar, atualiza em background
      if (this.isCacheStale(cached)) {
        this.refreshRatesInBackground()
      }
      return
    }

    // 2. Buscar da API
    try {
      await this.fetchFromApi()
    } catch (error) {
      console.error('[CurrencyManager] ❌ API failed:', error)

      // 3. Usar cache stale se disponível
      if (cached && !this.isCacheExpired(cached)) {
        this.rates = cached.rates
        this.rateSource = 'cache'
        this.lastUpdate = cached.timestamp
        console.warn('[CurrencyManager] ⚠️ Using stale cache as fallback')
        return
      }

      // 4. Usar taxas de fallback
      this.rates = { ...FALLBACK_RATES }
      this.rateSource = 'fallback'
      this.lastUpdate = Date.now()
      console.warn('[CurrencyManager] ⚠️ Using fallback rates:', this.rates)
    }
  }

  /**
   * Busca taxas da API externa
   */
  private async fetchFromApi(): Promise<void> {
    console.log('[CurrencyManager] 📡 Fetching rates from API...')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    try {
      const response = await fetch(EXCHANGE_RATE_API, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      const data = await response.json()

      if (!data.rates || typeof data.rates !== 'object') {
        throw new Error('Invalid API response format')
      }

      // Extrair apenas moedas suportadas
      this.rates = {
        USD: 1,
        BRL: data.rates.BRL || FALLBACK_RATES.BRL,
        EUR: data.rates.EUR || FALLBACK_RATES.EUR,
      }
      this.rateSource = 'api'
      this.lastUpdate = Date.now()

      // Salvar no cache
      this.saveToCache()

      console.log('[CurrencyManager] ✅ Rates updated from API:', this.rates)
      this.notifyListeners()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * Atualiza taxas em background (não bloqueia UI)
   */
  private refreshRatesInBackground(): void {
    console.log('[CurrencyManager] 🔄 Refreshing rates in background...')
    this.fetchFromApi().catch(err => {
      console.warn('[CurrencyManager] Background refresh failed:', err)
    })
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  private loadFromCache(): CachedRates | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null

      const cached: CachedRates = JSON.parse(raw)

      // Verificar versão do cache
      if (cached.version !== CACHE_VERSION) {
        console.log('[CurrencyManager] Cache version mismatch, clearing...')
        localStorage.removeItem(CACHE_KEY)
        return null
      }

      return cached
    } catch {
      return null
    }
  }

  private saveToCache(): void {
    try {
      const data: CachedRates = {
        version: CACHE_VERSION,
        rates: this.rates,
        timestamp: this.lastUpdate,
        source: this.rateSource,
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch (error) {
      console.warn('[CurrencyManager] Failed to save cache:', error)
    }
  }

  private isCacheValid(cached: CachedRates): boolean {
    return Date.now() - cached.timestamp < CACHE_TTL
  }

  private isCacheStale(cached: CachedRates): boolean {
    const age = Date.now() - cached.timestamp
    return age > CACHE_TTL * 0.75 // 75% do TTL
  }

  private isCacheExpired(cached: CachedRates): boolean {
    return Date.now() - cached.timestamp > STALE_TTL
  }

  // ==========================================================================
  // CONVERSION METHODS
  // ==========================================================================

  /**
   * Converte valor de uma moeda para outra
   *
   * @example
   * // Converter USD 100 para BRL
   * const result = manager.convert(100, 'USD', 'BRL')
   * console.log(result.convertedValue) // ~610
   */
  convert(
    amount: number,
    from: SupportedCurrency = 'USD',
    to: SupportedCurrency = 'BRL'
  ): ConversionResult {
    // Garantir inicialização
    if (!this.initPromise) {
      this.initialize()
    }

    // Validação
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      return {
        originalValue: 0,
        originalCurrency: from,
        convertedValue: 0,
        targetCurrency: to,
        rate: 1,
        rateSource: this.rateSource,
        timestamp: Date.now(),
      }
    }

    // Mesma moeda = sem conversão
    if (from === to) {
      return {
        originalValue: amount,
        originalCurrency: from,
        convertedValue: amount,
        targetCurrency: to,
        rate: 1,
        rateSource: this.rateSource,
        timestamp: Date.now(),
      }
    }

    // Calcular taxa
    const fromRate = this.rates[from] || 1
    const toRate = this.rates[to] || 1
    const rate = toRate / fromRate

    // Converter
    const converted = amount * rate

    return {
      originalValue: amount,
      originalCurrency: from,
      convertedValue: converted,
      targetCurrency: to,
      rate,
      rateSource: this.rateSource,
      timestamp: Date.now(),
    }
  }

  /**
   * Obtém a taxa de conversão entre duas moedas
   */
  getRate(from: SupportedCurrency = 'USD', to: SupportedCurrency = 'BRL'): number {
    if (from === to) return 1

    const fromRate = this.rates[from] || 1
    const toRate = this.rates[to] || 1

    return toRate / fromRate
  }

  /**
   * Converte preço de USD para moeda do usuário (caso mais comum)
   */
  fromUSD(amountUSD: number, targetCurrency: SupportedCurrency = 'BRL'): number {
    return this.convert(amountUSD, 'USD', targetCurrency).convertedValue
  }

  /**
   * Converte preço da moeda do usuário para USD (para enviar ao backend)
   */
  toUSD(amount: number, fromCurrency: SupportedCurrency = 'BRL'): number {
    return this.convert(amount, fromCurrency, 'USD').convertedValue
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Força atualização das taxas
   */
  async forceRefresh(): Promise<Record<string, number>> {
    localStorage.removeItem(CACHE_KEY)
    await this.fetchFromApi()
    return { ...this.rates }
  }

  /**
   * Obtém todas as taxas atuais
   */
  getRates(): Record<string, number> {
    return { ...this.rates }
  }

  /**
   * Obtém informações de status
   */
  getStatus(): {
    rates: Record<string, number>
    source: 'api' | 'cache' | 'fallback'
    lastUpdate: Date
    isStale: boolean
  } {
    return {
      rates: { ...this.rates },
      source: this.rateSource,
      lastUpdate: new Date(this.lastUpdate),
      isStale: Date.now() - this.lastUpdate > CACHE_TTL,
    }
  }

  /**
   * Adiciona listener para mudanças de taxa
   */
  onRatesChange(callback: (rates: Record<string, number>) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener({ ...this.rates })
      } catch (error) {
        console.error('[CurrencyManager] Listener error:', error)
      }
    }
  }

  /**
   * Limpa cache (para testes/debug)
   */
  clearCache(): void {
    localStorage.removeItem(CACHE_KEY)
    console.log('[CurrencyManager] Cache cleared')
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Singleton instance
export const currencyManager = CurrencyManager.getInstance()

// Inicializar automaticamente
currencyManager.initialize()

// Helper functions para uso direto
export const convertCurrency = currencyManager.convert.bind(currencyManager)
export const fromUSD = currencyManager.fromUSD.bind(currencyManager)
export const toUSD = currencyManager.toUSD.bind(currencyManager)
export const getExchangeRate = currencyManager.getRate.bind(currencyManager)

export default currencyManager
