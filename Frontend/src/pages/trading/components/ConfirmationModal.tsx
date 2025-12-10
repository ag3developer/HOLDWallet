import React, { useState } from 'react'
import { X, Loader } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

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

interface ConfirmationModalProps {
  readonly isOpen: boolean
  readonly quote: Quote | null
  readonly currencySymbol: string
  readonly currencyLocale: string
  readonly convertFromBRL: (value: number) => number
  readonly onClose: () => void
  readonly onSuccess: (tradeId: string) => void
}

const PAYMENT_METHODS = [
  { id: 'pix', name: 'PIX', label: 'PIX' },
  { id: 'credit_card', name: 'Credit Card', label: 'Card' },
  { id: 'bank_transfer', name: 'Bank Transfer', label: 'Bank' },
  { id: 'wallet', name: 'Wallet', label: 'Wallet' },
]

const API_BASE = 'http://127.0.0.1:8000/api/v1'

export function ConfirmationModal({
  isOpen,
  quote,
  currencySymbol,
  currencyLocale,
  convertFromBRL,
  onClose,
  onSuccess,
}: ConfirmationModalProps) {
  const [selectedPayment, setSelectedPayment] = useState('pix')
  const [loading, setLoading] = useState(false)

  const createTrade = async () => {
    if (!quote) return

    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/instant-trade/create`, {
        quote_id: quote.quote_id,
        payment_method: selectedPayment,
      })

      toast.success('Trade created successfully!')
      onSuccess(response.data.trade_id)
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error creating trade')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !quote) return null

  const formatValue = (value: number | undefined) => {
    // Safe type checking and validation
    if (value === null || value === undefined || typeof value !== 'number') {
      return '0.00'
    }
    if (Number.isNaN(value)) {
      return '0.00'
    }

    // IMPORTANTE: Os preços do backend já vêm na moeda solicitada
    // Portanto, usar o valor direto sem converter
    const safeValue = Number.isFinite(value) ? value : 0

    if (!Number.isFinite(safeValue)) {
      return '0.00'
    }

    return safeValue.toLocaleString(currencyLocale, { maximumFractionDigits: 2 })
  }

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2'>
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full max-h-[95vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700'>
          <h2 className='text-sm font-bold text-gray-900 dark:text-white'>Confirm Trade</h2>
          <button
            onClick={onClose}
            disabled={loading}
            title='Close modal'
            className='text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-3 space-y-2'>
          {/* Trade Summary */}
          <div className='space-y-1'>
            <h3 className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
              Trade Summary
            </h3>
            <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-2 space-y-1'>
              <div className='flex justify-between text-xs'>
                <span className='text-gray-600 dark:text-gray-400'>Operation</span>
                <span className='font-medium text-gray-900 dark:text-white capitalize'>
                  {quote.operation}
                </span>
              </div>
              <div className='flex justify-between text-xs'>
                <span className='text-gray-600 dark:text-gray-400'>Crypto</span>
                <span className='font-medium text-gray-900 dark:text-white'>{quote.symbol}</span>
              </div>
              <div className='flex justify-between text-xs'>
                <span className='text-gray-600 dark:text-gray-400'>Amount</span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {quote.operation === 'buy'
                    ? `${currencySymbol} ${formatValue(quote.fiat_amount ?? 0)}`
                    : `${(quote.crypto_amount ?? 0).toFixed(8)} ${quote.symbol}`}
                </span>
              </div>
              <div className='flex justify-between text-xs pt-1 border-t border-gray-200 dark:border-gray-600'>
                <span className='font-semibold text-gray-900 dark:text-white'>Total</span>
                <span className='font-bold text-blue-600'>
                  {currencySymbol} {formatValue(quote.total_amount ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className='space-y-1'>
            <h3 className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
              Payment Method
            </h3>
            <div className='grid grid-cols-4 gap-1'>
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`p-1 rounded text-center border transition-all ${
                    selectedPayment === method.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                    {method.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quote ID */}
          <div className='text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded'>
            <span className='font-mono'>ID: {(quote.quote_id ?? '').substring(0, 8)}...</span>
          </div>

          {/* Action Buttons */}
          <div className='flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700'>
            <button
              onClick={onClose}
              disabled={loading}
              className='flex-1 px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Cancel
            </button>
            <button
              onClick={createTrade}
              disabled={loading}
              className='flex-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1'
            >
              {loading ? (
                <>
                  <Loader className='w-3 h-3 animate-spin' />
                  <span>Processing...</span>
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
