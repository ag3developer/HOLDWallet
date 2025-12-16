/**
 * Serviço de conversão de moedas
 * Mantém as taxas de câmbio e realiza conversões entre moedas
 *
 * ⚠️ PADRÃO: Todos os preços do backend vêm em USD
 * Conversão: USD → BRL usando taxas REAIS do mercado (via API)
 */

import { exchangeRateApi } from './exchange-rate-api'

// Taxas de câmbio em relação a USD (base)
// 1 USD = X de outra moeda
// ⚠️ Estas são as taxas INICIAIS, serão atualizadas pela API
let EXCHANGE_RATES: Record<string, number> = {
  USD: 1, // Base currency
  BRL: 6, // Será atualizada pela API
  EUR: 0.92, // Será atualizada pela API
}

// Flag para controlar se já iniciou o carregamento de taxas
let ratesInitialized = false

/**
 * Inicializa as taxas de câmbio buscando da API
 * Chamado automaticamente na primeira conversão
 */
async function initializeRates() {
  if (ratesInitialized) return
  ratesInitialized = true

  console.log('[CurrencyConverter] Initializing exchange rates from API...')
  const realRates = await exchangeRateApi.fetchRealRates()
  EXCHANGE_RATES = realRates
  console.log('[CurrencyConverter] Exchange rates updated:', EXCHANGE_RATES)
}

// Inicializar as taxas imediatamente
initializeRates()

export const currencyConverterService = {
  /**
   * Converte um valor de uma moeda para outra
   * @param amount Valor a ser convertido
   * @param fromCurrency Moeda de origem
   * @param toCurrency Moeda de destino
   * @returns Valor convertido
   *
   * ⚠️ PADRÃO: USD é a base (todas as conversões passam por USD)
   * Exemplo: USD 100 → BRL 500 (100 * 5)
   *          USD 100 → EUR 92 (100 * 0.92)
   */
  convert: (amount: number, fromCurrency: string = 'USD', toCurrency: string = 'BRL'): number => {
    if (fromCurrency === toCurrency) {
      return amount
    }

    const fromRate = EXCHANGE_RATES[fromCurrency] || 1
    const toRate = EXCHANGE_RATES[toCurrency] || 1

    // Converter para USD primeiro (base), depois para moeda destino
    const inUSD = fromCurrency === 'USD' ? amount : amount / fromRate
    const converted = inUSD * toRate

    return converted
  },

  /**
   * Obtém a taxa de câmbio entre duas moedas
   */
  getRate: (fromCurrency: string = 'USD', toCurrency: string = 'BRL'): number => {
    if (fromCurrency === toCurrency) {
      return 1
    }

    const fromRate = EXCHANGE_RATES[fromCurrency] || 1
    const toRate = EXCHANGE_RATES[toCurrency] || 1

    return toRate / fromRate
  },

  /**
   * Atualiza as taxas de câmbio
   * Útil para integração com APIs de câmbio em tempo real
   */
  updateRates: (newRates: Record<string, number>) => {
    Object.assign(EXCHANGE_RATES, newRates)
    console.log('[CurrencyConverter] Rates manually updated:', EXCHANGE_RATES)
  },

  /**
   * Obtém todas as taxas atuais
   */
  getRates: () => ({ ...EXCHANGE_RATES }),

  /**
   * Força atualização das taxas de câmbio da API
   * Útil para botão de "Refresh" ou atualização manual
   */
  refreshRates: async () => {
    console.log('[CurrencyConverter] Manually refreshing rates...')
    const realRates = await exchangeRateApi.forceRefresh()
    EXCHANGE_RATES = realRates
    console.log('[CurrencyConverter] Rates refreshed:', EXCHANGE_RATES)
    return realRates
  },
}
