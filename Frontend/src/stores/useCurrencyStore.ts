/**
 * 🏦 HOLD Wallet - Currency Store (Enterprise Grade)
 * ===================================================
 *
 * Store Zustand para gerenciamento de moeda do usuário.
 * Integrado com CurrencyManager centralizado.
 *
 * 📐 PADRÃO ENTERPRISE:
 * ─────────────────────
 * 1. Backend → SEMPRE retorna valores em USD
 * 2. Store → Guarda preferência do usuário (USD/BRL/EUR)
 * 3. formatCurrency → Converte USD→moeda usando CurrencyManager
 * 4. Persistência → LocalStorage para lembrar preferência
 *
 * @version 2.0.0
 * @enterprise true
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { currencyManager, type SupportedCurrency } from '@/services/currency'

export type Currency = SupportedCurrency

interface CurrencyStore {
  currency: Currency
  setCurrency: (currency: Currency) => void
  formatCurrency: (amountUSD: number, overrideCurrency?: Currency) => string
  formatCurrencyRaw: (amountUSD: number, overrideCurrency?: Currency) => number
  convertToUSD: (amount: number, fromCurrency?: Currency) => number
  getExchangeRate: () => number
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      currency: 'USD', // ⚠️ Default é USD

      setCurrency: (currency: Currency) => {
        console.log(`[CurrencyStore] Currency changed to: ${currency}`)
        set({ currency })
      },

      /**
       * Formata um valor USD para a moeda do usuário
       *
       * ⚠️ IMPORTANTE: O valor de entrada DEVE estar em USD!
       * Este é o padrão enterprise - backend sempre retorna USD.
       *
       * @param amountUSD - Valor em USD (do backend)
       * @param overrideCurrency - Moeda de destino (opcional, usa store se não fornecido)
       * @returns String formatada (ex: "R$ 610,00" ou "$100.00")
       */
      formatCurrency: (amountUSD: number, overrideCurrency?: Currency): string => {
        const targetCurrency = overrideCurrency || get().currency

        // Converter USD → moeda do usuário
        const result = currencyManager.convert(amountUSD, 'USD', targetCurrency)
        const displayAmount = result.convertedValue

        // Formatação por locale
        const localeConfig: Record<Currency, { locale: string; code: string }> = {
          USD: { locale: 'en-US', code: 'USD' },
          BRL: { locale: 'pt-BR', code: 'BRL' },
          EUR: { locale: 'de-DE', code: 'EUR' },
        }

        const { locale, code } = localeConfig[targetCurrency]
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: code,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(displayAmount)
      },

      /**
       * Converte USD para moeda do usuário (retorna número, não string)
       * Útil para cálculos e comparações
       */
      formatCurrencyRaw: (amountUSD: number, overrideCurrency?: Currency): number => {
        const targetCurrency = overrideCurrency || get().currency
        return currencyManager.convert(amountUSD, 'USD', targetCurrency).convertedValue
      },

      /**
       * Converte da moeda do usuário para USD
       * Útil para enviar valores ao backend
       *
       * @param amount - Valor na moeda do usuário
       * @param fromCurrency - Moeda de origem (opcional, usa store se não fornecido)
       * @returns Valor em USD para enviar ao backend
       */
      convertToUSD: (amount: number, fromCurrency?: Currency): number => {
        const sourceCurrency = fromCurrency || get().currency
        return currencyManager.convert(amount, sourceCurrency, 'USD').convertedValue
      },

      /**
       * Obtém taxa de conversão atual (USD → moeda do usuário)
       */
      getExchangeRate: (): number => {
        const targetCurrency = get().currency
        return currencyManager.getRate('USD', targetCurrency)
      },
    }),
    {
      name: 'currency-store',
    }
  )
)
