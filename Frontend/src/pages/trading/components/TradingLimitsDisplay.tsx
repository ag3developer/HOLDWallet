import React from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import {
  validateTradingLimit,
  getLimitInfo,
  type AccountType,
  type CurrencyType,
} from '../utils/tradingLimits'

interface TradingLimitsDisplayProps {
  readonly accountType: AccountType
  readonly amount: number
  readonly currency: CurrencyType
  readonly convertFromBRL: (value: number) => number
  readonly dailySpent?: number
  readonly currencySymbol: string
}

export function TradingLimitsDisplay({
  accountType,
  amount,
  currency,
  convertFromBRL,
  dailySpent = 0,
  currencySymbol,
}: TradingLimitsDisplayProps) {
  const limitStatus = validateTradingLimit(
    amount,
    accountType,
    currency,
    convertFromBRL,
    dailySpent
  )
  const limitInfo = getLimitInfo(accountType)

  const barWidth = Math.min(limitStatus.percentUsed, 100)
  const getBarColor = (): string => {
    if (limitStatus.percentUsed >= 100) return 'bg-red-600'
    if (limitStatus.percentUsed >= 80) return 'bg-amber-600'
    return 'bg-green-600'
  }

  return (
    <div className='space-y-3'>
      {/* Limit Info Card */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-3'>
        <div className='flex items-start gap-2'>
          <div className='flex-shrink-0 mt-0.5'>
            {limitStatus.isValid ? (
              <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400' />
            ) : (
              <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400' />
            )}
          </div>
          <div className='flex-1'>
            <p
              className={`text-sm font-medium ${
                limitStatus.isValid
                  ? 'text-green-900 dark:text-green-200'
                  : 'text-red-900 dark:text-red-200'
              }`}
            >
              {limitStatus.message}
            </p>
          </div>
        </div>
      </div>

      {/* Limit Progress Bar */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-3'>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
            Limite Diário - {limitInfo.type}
          </span>
          <span className='text-xs font-bold text-gray-900 dark:text-white'>
            {limitStatus.percentUsed.toFixed(1)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden'>
          <div
            className={`h-full transition-all duration-300 ${getBarColor()} ${barWidth >= 100 ? 'w-full' : ''} ${barWidth >= 80 && barWidth < 100 ? 'w-4/5' : ''} ${barWidth < 80 ? 'w-1/2' : ''}`}
          />
        </div>

        {/* Limit Info */}
        <div className='grid grid-cols-2 gap-2 mt-2'>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400'>Usado Hoje</p>
            <p className='text-sm font-semibold text-gray-900 dark:text-white'>
              {currencySymbol}{' '}
              {(dailySpent + amount).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400'>Limite Diário</p>
            <p className='text-sm font-semibold text-gray-900 dark:text-white'>
              {currencySymbol} {limitInfo.max.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Min/Max Limits Card */}
      <div className='bg-blue-50 dark:bg-blue-900/30 rounded-lg shadow p-3 border-l-2 border-blue-500'>
        <h4 className='text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2'>
          Regras de Operação
        </h4>
        <div className='space-y-1 text-xs text-blue-800 dark:text-blue-300'>
          <p>
            <span className='font-medium'>Mínimo:</span> {currencySymbol}{' '}
            {limitInfo.min.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p>
            <span className='font-medium'>Máximo Diário:</span> {currencySymbol}{' '}
            {limitInfo.max.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
          <p>
            <span className='font-medium'>Tipo de Conta:</span> {limitInfo.type}
          </p>
        </div>
      </div>

      {/* Warning if exceeding */}
      {!limitStatus.isValid && (
        <div className='bg-red-50 dark:bg-red-900/30 rounded-lg shadow p-3 border-l-2 border-red-500'>
          <p className='text-xs text-red-800 dark:text-red-300'>
            ⚠️ Limite excedido. Você pode operar até {currencySymbol}{' '}
            {limitStatus.remaining.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} hoje.
          </p>
        </div>
      )}
    </div>
  )
}
