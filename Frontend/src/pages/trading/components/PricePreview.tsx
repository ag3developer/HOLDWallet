import React, { useMemo } from 'react'
import { TrendingUp, Info } from 'lucide-react'

interface PricePreviewProps {
  readonly amount: string
  readonly symbol: string
  readonly price: number
  readonly isBuy: boolean
  readonly spreadPercentage?: number
  readonly networkFeePercentage?: number
  readonly currencySymbol: string
  readonly currencyLocale: string
}

export function PricePreview({
  amount,
  symbol,
  price,
  isBuy,
  spreadPercentage = 3,
  networkFeePercentage = 0.25,
  currencySymbol,
  currencyLocale,
}: PricePreviewProps) {
  const calculatePreview = useMemo(() => {
    const numAmount = Number(amount)

    if (!numAmount || numAmount <= 0) {
      return null
    }

    if (isBuy) {
      // Buy: User pays in fiat, receives crypto
      const fiatAmount = numAmount
      const cryptoBeforeFees = fiatAmount / price
      const spreadAmount = cryptoBeforeFees * (spreadPercentage / 100)
      const networkFeeAmount = cryptoBeforeFees * (networkFeePercentage / 100)
      const totalFees = spreadAmount + networkFeeAmount
      const cryptoAmount = cryptoBeforeFees - totalFees

      return {
        type: 'buy',
        fiatAmount,
        cryptoBeforeFees,
        spreadAmount,
        networkFeeAmount,
        totalFees,
        cryptoAmount,
        totalFiatPaid: fiatAmount + spreadAmount + networkFeeAmount,
      }
    } else {
      // Sell: User sells crypto, receives fiat
      const cryptoAmount = numAmount
      const fiatBeforeFees = cryptoAmount * price
      const spreadAmount = fiatBeforeFees * (spreadPercentage / 100)
      const networkFeeAmount = fiatBeforeFees * (networkFeePercentage / 100)
      const totalFees = spreadAmount + networkFeeAmount
      const fiatAmount = fiatBeforeFees - totalFees

      return {
        type: 'sell',
        cryptoAmount,
        fiatBeforeFees,
        spreadAmount,
        networkFeeAmount,
        totalFees,
        fiatAmount,
        totalFiatReceived: fiatAmount,
      }
    }
  }, [amount, price, isBuy, spreadPercentage, networkFeePercentage])

  if (!calculatePreview) {
    return null
  }

  const formatValue = (value: number) => {
    try {
      return value.toLocaleString(currencyLocale, { maximumFractionDigits: 2 })
    } catch {
      return value.toFixed(2)
    }
  }

  const formatCrypto = (value: number) => {
    return value.toFixed(8)
  }

  return (
    <div className='bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 space-y-3'>
      {/* Header */}
      <div className='flex items-center gap-2'>
        <TrendingUp className='w-4 h-4 text-green-600 dark:text-green-400' />
        <p className='text-sm font-semibold text-green-900 dark:text-green-300'>
          Estimativa da Operação
        </p>
      </div>

      {/* Main Result */}
      <div className='bg-white dark:bg-gray-800 rounded p-3 border border-green-100 dark:border-green-800/50'>
        {calculatePreview.type === 'buy' ? (
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>Você receberá</p>
            <p className='text-lg font-bold text-green-600 dark:text-green-400'>
              {formatCrypto(calculatePreview.cryptoAmount)} {symbol}
            </p>
            <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
              Pagando {currencySymbol} {formatValue(calculatePreview.totalFiatPaid ?? 0)}
            </p>
          </div>
        ) : (
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>Você receberá</p>
            <p className='text-lg font-bold text-green-600 dark:text-green-400'>
              {currencySymbol} {formatValue(calculatePreview.fiatAmount)}
            </p>
            <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
              Vendendo {formatCrypto(calculatePreview.cryptoAmount)} {symbol}
            </p>
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div className='space-y-2 text-xs'>
        {calculatePreview.type === 'buy' ? (
          <>
            <div className='flex justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>Preço por {symbol}</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {currencySymbol} {formatValue(price)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>Spread (3%)</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {formatCrypto(calculatePreview.spreadAmount)} {symbol}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>Taxa de Rede (0.25%)</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {formatCrypto(calculatePreview.networkFeeAmount)} {symbol}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className='flex justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>Preço por {symbol}</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {currencySymbol} {formatValue(price)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>Spread (3%)</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                -{currencySymbol} {formatValue(calculatePreview.spreadAmount)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>Taxa de Rede (0.25%)</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                -{currencySymbol} {formatValue(calculatePreview.networkFeeAmount)}
              </span>
            </div>
          </>
        )}

        {/* Total Fees */}
        <div className='border-t border-green-200 dark:border-green-700 pt-2 flex justify-between'>
          <span className='font-semibold text-gray-900 dark:text-white'>Total de Fees</span>
          <span className='font-bold text-orange-600 dark:text-orange-400'>
            {calculatePreview.type === 'buy'
              ? `${formatCrypto(calculatePreview.totalFees)} ${symbol}`
              : `${currencySymbol} ${formatValue(calculatePreview.totalFees)}`}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className='bg-green-100/50 dark:bg-green-900/30 rounded px-2 py-1 text-xs text-green-800 dark:text-green-300 flex items-start gap-2'>
        <Info className='w-4 h-4 flex-shrink-0 mt-0.5' />
        <span>Esta é uma estimativa. Os valores finais podem variar levemente.</span>
      </div>
    </div>
  )
}
