/**
 * Serviço de conversão de moedas
 * Mantém as taxas de câmbio e realiza conversões entre moedas
 */

// Taxas de câmbio aproximadas (você pode integrar com uma API real)
// Atualizar estas taxas regularmente ou buscar de uma API
const EXCHANGE_RATES: Record<string, number> = {
  BRL: 1, // Base currency
  USD: 0.2, // 1 BRL = 0.20 USD
  EUR: 0.19, // 1 BRL = 0.19 EUR
}

export const currencyConverterService = {
  /**
   * Converte um valor de uma moeda para outra
   * @param amount Valor a ser convertido
   * @param fromCurrency Moeda de origem (padrão BRL)
   * @param toCurrency Moeda de destino (padrão USD)
   * @returns Valor convertido
   */
  convert: (amount: number, fromCurrency: string = 'BRL', toCurrency: string = 'USD'): number => {
    if (fromCurrency === toCurrency) {
      return amount
    }

    const fromRate = EXCHANGE_RATES[fromCurrency] || 1
    const toRate = EXCHANGE_RATES[toCurrency] || 1

    // Converter para a moeda base (BRL) e depois para a moeda destino
    const inBRL = fromCurrency === 'BRL' ? amount : amount / fromRate
    const converted = inBRL * toRate

    return converted
  },

  /**
   * Obtém a taxa de câmbio entre duas moedas
   */
  getRate: (fromCurrency: string = 'BRL', toCurrency: string = 'USD'): number => {
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
