import React, { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { currencyConverterService } from '@/services/currency-converter-service'
import { useCurrencyStore } from '@/stores/useCurrencyStore'

export const ExchangeRateDisplay: React.FC = () => {
  const { currency } = useCurrencyStore()
  const [rate, setRate] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    updateRate()
  }, [currency])

  const updateRate = () => {
    const rates = currencyConverterService.getRates()
    setRate(rates[currency] || 1)
    setLastUpdate(new Date())
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await currencyConverterService.refreshRates()
      updateRate()
    } finally {
      setLoading(false)
    }
  }

  if (currency === 'USD') {
    return null // Não mostrar se a moeda base já é USD
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className='flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm'>
      <div className='flex-1'>
        <span className='text-gray-600 dark:text-gray-400'>Taxa de câmbio (USD → {currency}):</span>
        <span className='ml-2 font-semibold text-blue-600 dark:text-blue-400'>
          1 USD = {rate.toFixed(2)} {currency}
        </span>
        <span className='ml-2 text-xs text-gray-500'>(atualizado {formatTime(lastUpdate)})</span>
      </div>
      <button
        onClick={handleRefresh}
        disabled={loading}
        className='p-1.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors disabled:opacity-50'
        title='Atualizar taxa'
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
