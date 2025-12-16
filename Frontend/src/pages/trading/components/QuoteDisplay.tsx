import React, { useState, useEffect } from 'react'
import { Clock, ChevronDown } from 'lucide-react'

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
  readonly currencySymbol: string
  readonly currencyLocale: string
  readonly convertFromBRL: (value: number) => number
  readonly onConfirmClick: () => void
}

export function QuoteDisplay({
  quote,
  currencySymbol,
  currencyLocale,
  convertFromBRL,
  onConfirmClick,
}: QuoteDisplayProps) {
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

  const formatValue = (value: number | undefined) => {
    // Safe type checking and validation
    if (value === null || value === undefined || typeof value !== 'number') {
      return '0.00'
    }
    if (Number.isNaN(value)) {
      return '0.00'
    }

    const converted = convertFromBRL(value)
    const safeValue = typeof converted === 'number' && !Number.isNaN(converted) ? converted : value

    if (!Number.isFinite(safeValue)) {
      return '0.00'
    }

    return safeValue.toLocaleString(currencyLocale, { maximumFractionDigits: 2 })
  }

  return (
    <div className='bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg shadow p-3'>
      {/* Header */}
      <div className='flex items-center justify-between mb-2'>
        <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>Quote</h3>
        <div className='flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400'>
          <Clock className='w-4 h-4' />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Quote Breakdown */}
      <div className='space-y-1 mb-2'>
        {/* Price (Total Value) */}
        <div className='flex justify-between items-center p-1.5 text-xs bg-white dark:bg-gray-800 rounded'>
          <span className='text-gray-600 dark:text-gray-400'>Price</span>
          <span className='font-medium text-gray-900 dark:text-white'>
            {currencySymbol} {formatValue(quote.fiat_amount ?? 0)}
          </span>
        </div>

        {/* Spread */}
        <div className='flex justify-between items-center p-1.5 text-xs bg-white dark:bg-gray-800 rounded'>
          <span className='text-gray-600 dark:text-gray-400'>
            Spread ({(quote.spread_percentage ?? 0).toFixed(2)}%)
          </span>
          <span className='font-medium text-gray-900 dark:text-white'>
            {currencySymbol} {formatValue(quote.spread_amount ?? 0)}
          </span>
        </div>

        {/* Network Fee */}
        <div className='flex justify-between items-center p-1.5 text-xs bg-white dark:bg-gray-800 rounded'>
          <span className='text-gray-600 dark:text-gray-400'>
            Fee ({(quote.network_fee_percentage ?? 0).toFixed(2)}%)
          </span>
          <span className='font-medium text-gray-900 dark:text-white'>
            {currencySymbol} {formatValue(quote.network_fee_amount ?? 0)}
          </span>
        </div>

        {/* Total */}
        <div className='flex justify-between items-center p-1.5 text-xs bg-gradient-to-r from-blue-600 to-blue-700 rounded'>
          <span className='font-semibold text-white'>Total</span>
          <span className='font-bold text-white'>
            {currencySymbol} {formatValue(quote.total_amount ?? 0)}
          </span>
        </div>
      </div>

      {/* Detailed Fee Breakdown Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className='w-full flex items-center justify-between p-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded transition-colors mb-2'
      >
        <span className='font-medium'>Fee Breakdown</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Detailed Breakdown */}
      {showDetails && (
        <div className='bg-white dark:bg-gray-800 rounded p-2 mb-2 space-y-1 text-xs'>
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
                  {currencySymbol} {formatValue(quote.crypto_price ?? 0)}
                </span>
              </div>

              <div className='border-t border-gray-200 dark:border-gray-700 my-1 pt-1'>
                <div className='flex justify-between mb-1 font-semibold text-gray-900 dark:text-white'>
                  <span>Fiat Value (Before Fees)</span>
                  <span>
                    {currencySymbol} {formatValue(quote.fiat_amount ?? 0)}
                  </span>
                </div>
              </div>

              <div className='border-t border-gray-200 dark:border-gray-700 my-1 pt-1'>
                <div className='flex justify-between mb-1'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Spread ({(quote.spread_percentage ?? 0).toFixed(2)}%)
                  </span>
                  <span className='text-red-600 dark:text-red-400 font-medium'>
                    -{currencySymbol} {formatValue(quote.spread_amount ?? 0)}
                  </span>
                </div>

                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Network Fee ({(quote.network_fee_percentage ?? 0).toFixed(2)}%)
                  </span>
                  <span className='text-red-600 dark:text-red-400 font-medium'>
                    -{currencySymbol} {formatValue(quote.network_fee_amount ?? 0)}
                  </span>
                </div>
              </div>

              <div className='border-t border-gray-200 dark:border-gray-700 pt-1 flex justify-between font-semibold text-green-600 dark:text-green-400'>
                <span>You Receive</span>
                <span>
                  {currencySymbol} {formatValue(quote.total_amount ?? 0)}
                </span>
              </div>

              <div className='pt-1 border-t border-gray-200 dark:border-gray-700'>
                <div className='text-gray-600 dark:text-gray-400 text-xs'>
                  <p>
                    Total Costs:{' '}
                    {((quote.spread_percentage ?? 0) + (quote.network_fee_percentage ?? 0)).toFixed(
                      2
                    )}
                    %
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>Fiat Amount</span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {currencySymbol} {formatValue(quote.fiat_amount ?? 0)}
                </span>
              </div>

              <div className='border-t border-gray-200 dark:border-gray-700 my-1 pt-1'>
                <div className='flex justify-between mb-1'>
                  <span className='text-gray-600 dark:text-gray-400'>Spread Cost</span>
                  <span className='text-red-600 dark:text-red-400 font-medium'>
                    -{currencySymbol} {formatValue(quote.spread_amount ?? 0)}
                  </span>
                </div>

                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Network Fee</span>
                  <span className='text-red-600 dark:text-red-400 font-medium'>
                    -{currencySymbol} {formatValue(quote.network_fee_amount ?? 0)}
                  </span>
                </div>
              </div>

              <div className='border-t border-gray-200 dark:border-gray-700 pt-1 flex justify-between font-semibold text-gray-900 dark:text-white'>
                <span>Final Amount</span>
                <span>
                  {currencySymbol} {formatValue(quote.total_amount ?? 0)}
                </span>
              </div>

              <div className='pt-1 border-t border-gray-200 dark:border-gray-700'>
                <div className='text-gray-600 dark:text-gray-400 text-xs'>
                  <p>
                    Total Costs:{' '}
                    {((quote.spread_percentage ?? 0) + (quote.network_fee_percentage ?? 0)).toFixed(
                      2
                    )}
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
        className='w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 rounded transition-colors'
      >
        Confirm & Continue
      </button>
    </div>
  )
}
