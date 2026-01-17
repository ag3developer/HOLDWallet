import React, { useState, useEffect } from 'react'
import { Clock, ChevronDown, Zap, ArrowRight, CheckCircle2 } from 'lucide-react'

interface Quote {
  quote_id: string
  operation: 'buy' | 'sell'
  symbol: string
  crypto_price: number
  fiat_amount: number
  crypto_amount: number
  spread_percentage: number
  spread_amount: number
  network_fee_percentage: number
  network_fee_amount: number
  total_amount: number
  expires_in_seconds: number
}

interface QuoteDisplayProps {
  readonly quote: Quote | null
  readonly onConfirmClick: () => void
}

export function QuoteDisplay({ quote, onConfirmClick }: QuoteDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(quote?.expires_in_seconds ?? 0)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (!quote) return

    setTimeLeft(quote.expires_in_seconds)
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [quote?.quote_id])

  if (!quote) return null

  // ⚠️ IMPORTANTE: Os valores do backend JÁ ESTÃO EM BRL!
  // NÃO usar formatCurrency que converte USD→BRL, pois já está em BRL
  // Apenas formatar o número como moeda brasileira
  const formatBRL = (value: number | undefined): string => {
    if (
      value === null ||
      value === undefined ||
      typeof value !== 'number' ||
      Number.isNaN(value) ||
      !Number.isFinite(value)
    ) {
      return 'R$ 0,00'
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Alias para compatibilidade
  const formatValue = formatBRL

  const isBuy = quote.operation === 'buy'
  const isExpiring = timeLeft <= 15
  const isExpired = timeLeft <= 0

  return (
    <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden'>
      {/* Header with Timer */}
      <div
        className={`px-5 py-4 border-b border-gray-100 dark:border-gray-700 ${isExpiring && !isExpired ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20' : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'}`}
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div
              className={`p-2 rounded-xl ${isBuy ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'} shadow-md`}
            >
              <Zap className='w-5 h-5 text-white' />
            </div>
            <div>
              <h3 className='font-bold text-gray-900 dark:text-white'>
                Cotação {isBuy ? 'Compra' : 'Venda'}
              </h3>
              <p className='text-xs text-gray-500 dark:text-gray-400'>{quote.symbol}</p>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              isExpired
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : isExpiring
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 animate-pulse'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            }`}
          >
            <Clock className='w-4 h-4' />
            <span className='text-sm font-bold'>{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Quote Content - Simplified View */}
      <div className='p-5 space-y-3'>
        {isBuy ? (
          <>
            {/* BUY: User pays fiat, receives crypto */}
            <div className='flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>Você Paga</span>
              <span className='font-semibold text-gray-900 dark:text-white'>
                {formatValue(quote.fiat_amount ?? 0)}
              </span>
            </div>

            {/* You Receive - CRYPTO */}
            <div className='flex justify-between items-center p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-md'>
              <div className='flex items-center gap-2'>
                <CheckCircle2 className='w-5 h-5 text-white' />
                <span className='font-semibold text-white'>Você Recebe</span>
              </div>
              <span className='font-bold text-lg text-white'>
                {(quote.crypto_amount ?? 0).toFixed(6)} {quote.symbol}
              </span>
            </div>
          </>
        ) : (
          <>
            {/* SELL: User sells crypto, receives fiat */}
            <div className='flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>Você Vende</span>
              <span className='font-semibold text-gray-900 dark:text-white'>
                {(quote.crypto_amount ?? 0).toFixed(6)} {quote.symbol}
              </span>
            </div>

            {/* You Receive - FIAT */}
            <div className='flex justify-between items-center p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-md'>
              <div className='flex items-center gap-2'>
                <CheckCircle2 className='w-5 h-5 text-white' />
                <span className='font-semibold text-white'>Você Recebe</span>
              </div>
              <span className='font-bold text-lg text-white'>
                {formatValue(quote.total_amount ?? 0)}
              </span>
            </div>
          </>
        )}

        {/* Detailed Fee Breakdown Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className='w-full flex items-center justify-between p-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors border border-gray-100 dark:border-gray-700'
        >
          <span className='font-medium'>Detalhes da Taxa</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Detailed Breakdown */}
        {showDetails && (
          <div className='bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2 text-sm'>
            {quote.operation === 'sell' ? (
              <>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Crypto Amount</span>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {(quote.crypto_amount ?? 0).toFixed(8)} {quote.symbol}
                  </span>
                </div>

                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Price per Unit</span>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {formatValue(quote.crypto_price ?? 0)}
                  </span>
                </div>

                <div className='border-t border-gray-200 dark:border-gray-700 my-1 pt-1'>
                  <div className='flex justify-between mb-1 font-semibold text-gray-900 dark:text-white'>
                    <span>Fiat Value (Before Fees)</span>
                    <span>{formatValue(quote.fiat_amount ?? 0)}</span>
                  </div>
                </div>

                <div className='border-t border-gray-200 dark:border-gray-700 my-1 pt-1'>
                  <div className='flex justify-between mb-1'>
                    <span className='text-gray-600 dark:text-gray-400'>
                      Spread ({(quote.spread_percentage ?? 0).toFixed(2)}%)
                    </span>
                    <span className='text-red-600 dark:text-red-400 font-medium'>
                      -{formatValue(quote.spread_amount ?? 0)}
                    </span>
                  </div>

                  <div className='flex justify-between'>
                    <span className='text-gray-600 dark:text-gray-400'>
                      Network Fee ({(quote.network_fee_percentage ?? 0).toFixed(2)}%)
                    </span>
                    <span className='text-red-600 dark:text-red-400 font-medium'>
                      -{formatValue(quote.network_fee_amount ?? 0)}
                    </span>
                  </div>
                </div>

                <div className='border-t border-gray-200 dark:border-gray-700 pt-1 flex justify-between font-semibold text-green-600 dark:text-green-400'>
                  <span>You Receive</span>
                  <span>{formatValue(quote.total_amount ?? 0)}</span>
                </div>

                <div className='pt-1 border-t border-gray-200 dark:border-gray-700'>
                  <div className='text-gray-600 dark:text-gray-400 text-xs'>
                    <p>
                      Total Costs:{' '}
                      {(
                        (quote.spread_percentage ?? 0) + (quote.network_fee_percentage ?? 0)
                      ).toFixed(2)}
                      %
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* BUY Details */}
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>You Pay</span>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {formatValue(quote.fiat_amount ?? 0)}
                  </span>
                </div>

                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Price per {quote.symbol}</span>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {formatValue(quote.crypto_price ?? 0)}
                  </span>
                </div>

                <div className='border-t border-gray-200 dark:border-gray-700 my-1 pt-1'>
                  <div className='flex justify-between mb-1'>
                    <span className='text-gray-600 dark:text-gray-400'>
                      Spread ({(quote.spread_percentage ?? 0).toFixed(2)}%)
                    </span>
                    <span className='text-red-600 dark:text-red-400 font-medium'>
                      -{formatValue(quote.spread_amount ?? 0)}
                    </span>
                  </div>

                  <div className='flex justify-between'>
                    <span className='text-gray-600 dark:text-gray-400'>
                      Network Fee ({(quote.network_fee_percentage ?? 0).toFixed(2)}%)
                    </span>
                    <span className='text-red-600 dark:text-red-400 font-medium'>
                      -{formatValue(quote.network_fee_amount ?? 0)}
                    </span>
                  </div>
                </div>

                <div className='border-t border-gray-200 dark:border-gray-700 pt-1 flex justify-between font-semibold text-green-600 dark:text-green-400'>
                  <span>You Receive</span>
                  <span>
                    {(quote.crypto_amount ?? 0).toFixed(6)} {quote.symbol}
                  </span>
                </div>

                <div className='pt-1 border-t border-gray-200 dark:border-gray-700'>
                  <div className='text-gray-600 dark:text-gray-400 text-xs'>
                    <p>
                      Total Costs:{' '}
                      {(
                        (quote.spread_percentage ?? 0) + (quote.network_fee_percentage ?? 0)
                      ).toFixed(2)}
                      %
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={onConfirmClick}
          disabled={timeLeft <= 0}
          className={`w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 ${
            timeLeft <= 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98]'
          }`}
        >
          {timeLeft <= 0 ? (
            'Cotação Expirada - Obter Nova'
          ) : (
            <>
              Confirmar & Continuar
              <ArrowRight className='w-4 h-4' />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
