/**
 * 🏦 HOLD Wallet - Currency Module
 * =================================
 *
 * Módulo centralizado de gerenciamento de moedas.
 *
 * @example
 * import { currencyManager, fromUSD, toUSD } from '@/services/currency'
 *
 * // Converter USD para BRL
 * const brlValue = fromUSD(100, 'BRL') // ~610
 *
 * // Converter BRL para USD (para enviar ao backend)
 * const usdValue = toUSD(610, 'BRL') // ~100
 *
 * // Obter taxa de conversão
 * const rate = currencyManager.getRate('USD', 'BRL') // ~6.10
 */

export {
  currencyManager,
  convertCurrency,
  fromUSD,
  toUSD,
  getExchangeRate,
  type SupportedCurrency,
  type RateSource,
  type ConversionResult,
  type ExchangeRate,
} from './CurrencyManager'

export { default } from './CurrencyManager'
