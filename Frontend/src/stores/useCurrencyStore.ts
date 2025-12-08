import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { currencyConverterService } from '@/services/currency-converter-service'

export type Currency = 'USD' | 'BRL' | 'EUR'

interface CurrencyStore {
  currency: Currency
  setCurrency: (currency: Currency) => void
  formatCurrency: (amount: number, currency?: Currency) => string
  convertFromBRL: (amountInBRL: number) => number
  convertToBRL: (amount: number, fromCurrency?: Currency) => number
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      currency: 'USD',
      setCurrency: (currency: Currency) => set({ currency }),

      /**
       * Converte um valor em BRL para a moeda selecionada
       */
      convertFromBRL: (amountInBRL: number) => {
        const targetCurrency = get().currency
        return currencyConverterService.convert(amountInBRL, 'BRL', targetCurrency)
      },

      /**
       * Converte um valor da moeda selecionada para BRL
       */
      convertToBRL: (amount: number, fromCurrency?: Currency) => {
        const sourceCurrency = fromCurrency || get().currency
        return currencyConverterService.convert(amount, sourceCurrency, 'BRL')
      },

      /**
       * Formata um valor em BRL para a moeda selecionada com formatação apropriada
       */
      formatCurrency: (amount: number, currency?: Currency) => {
        const activeCurrency = currency || get().currency

        // Converter de BRL para a moeda ativa
        const convertedAmount = currencyConverterService.convert(amount, 'BRL', activeCurrency)

        const currencyLocale: Record<Currency, { locale: string; code: string }> = {
          USD: { locale: 'en-US', code: 'USD' },
          BRL: { locale: 'pt-BR', code: 'BRL' },
          EUR: { locale: 'de-DE', code: 'EUR' },
        }

        const { locale, code } = currencyLocale[activeCurrency]
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: code,
        }).format(convertedAmount)
      },
    }),
    {
      name: 'currency-store',
    }
  )
)
