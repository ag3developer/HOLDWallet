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
      currency: 'USD', // ⚠️ Sempre começa com USD
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
       * Formata um valor que vem do backend em USD
       * Converte para BRL se o usuário selecionou BRL nas Settings
       */
      formatCurrency: (amount: number, currency?: Currency) => {
        // ⚠️ PADRÃO: Backend sempre retorna valores em USD
        // Frontend converte para BRL conforme seleção em Settings
        const targetCurrency = currency || get().currency

        let displayAmount = amount // Já em USD do backend
        let displayCurrency: Currency = 'USD'

        // Se usuário quer ver em BRL, converte
        if (targetCurrency === 'BRL') {
          displayAmount = currencyConverterService.convert(amount, 'USD', 'BRL')
          displayCurrency = 'BRL'
        } else if (targetCurrency === 'EUR') {
          displayAmount = currencyConverterService.convert(amount, 'USD', 'EUR')
          displayCurrency = 'EUR'
        }

        const currencyLocale: Record<Currency, { locale: string; code: string }> = {
          USD: { locale: 'en-US', code: 'USD' },
          BRL: { locale: 'pt-BR', code: 'BRL' },
          EUR: { locale: 'de-DE', code: 'EUR' },
        }

        const { locale, code } = currencyLocale[displayCurrency]
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: code,
        }).format(displayAmount)
      },
    }),
    {
      name: 'currency-store',
    }
  )
)
