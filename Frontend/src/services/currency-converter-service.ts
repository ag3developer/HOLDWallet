/**
 * Serviço de conversão de moedas
 * Mantém as taxas de câmbio e realiza conversões entre moedas
 *
 * ⚠️ PADRÃO: Todos os preços do backend vêm em USD
 * Conversão: USD → BRL usando taxa ~5.0 (1 USD = 5 BRL)
 */

// Taxas de câmbio em relação a USD (base)
// 1 USD = X de outra moeda
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1, // Base currency
  BRL: 5, // 1 USD = 5 BRL (aproximadamente)
  EUR: 0.92, // 1 USD = 0.92 EUR (aproximadamente)
}

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
  },

  /**
   * Obtém todas as taxas atuais
   */
  getRates: () => ({ ...EXCHANGE_RATES }),
}
