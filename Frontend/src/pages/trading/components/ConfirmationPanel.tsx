import React, { useState } from 'react'
import {
  CheckCircle,
  Loader,
  ArrowLeft,
  Banknote,
  CreditCard,
  Building2,
  Wallet,
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { BankDetailsDisplay } from './BankDetailsDisplay'
import { TradeStatusMonitor } from './TradeStatusMonitor'

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

interface ConfirmationPanelProps {
  readonly quote: Quote
  readonly currencySymbol: string
  readonly currencyLocale: string
  readonly convertFromBRL: (value: number) => number
  readonly onBack: () => void
  readonly onSuccess: (tradeId: string) => void
}

const PAYMENT_METHODS = [
  { id: 'pix', name: 'PIX', icon: Banknote },
  { id: 'credit_card', name: 'Credit Card', icon: CreditCard },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: Building2 },
  { id: 'wallet', name: 'Wallet', icon: Wallet },
]

const API_BASE = 'http://127.0.0.1:8000/api/v1'

export function ConfirmationPanel({
  quote,
  currencySymbol,
  currencyLocale,
  convertFromBRL,
  onBack,
  onSuccess,
}: ConfirmationPanelProps) {
  const [selectedPayment, setSelectedPayment] = useState('pix')
  const [loading, setLoading] = useState(false)
  const [tradeCreated, setTradeCreated] = useState<string | null>(null)
  const [pendingProof, setPendingProof] = useState(false)

  const createTrade = async () => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/instant-trade/create`, {
        quote_id: quote.quote_id,
        payment_method: selectedPayment,
      })

      toast.success('Trade created successfully!')
      const tradeId = response.data.trade_id || response.data.id
      setTradeCreated(tradeId)
      onSuccess(tradeId)
    } catch (error: any) {
      // Handle 403 Forbidden - trade was created but waiting for proof of payment
      if (error.response?.status === 403) {
        // Extract trade ID from error response (backend should include it)
        const tradeId =
          error.response?.data?.trade_id || error.response?.data?.id || `pending_${Date.now()}`

        toast.success('Trade created! Awaiting payment proof. Please send your receipt.')
        setPendingProof(true)
        setTradeCreated(tradeId)

        // Call onSuccess to update parent component
        onSuccess(tradeId)
      } else {
        toast.error(
          error.response?.data?.detail || error.response?.data?.message || 'Error creating trade'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: number | undefined) => {
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

  const isBuy = quote.operation === 'buy'

  if (tradeCreated) {
    return (
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4'>
        <div className='flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex-1'>
            <h2 className='text-sm font-bold text-gray-900 dark:text-white'>
              {pendingProof ? 'Awaiting Payment Proof' : 'Trade Status'}
            </h2>
          </div>
        </div>

        {pendingProof ? (
          <div className='space-y-4'>
            {/* Pending Status Message */}
            <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4'>
              <div className='flex items-start gap-3'>
                <div className='flex-shrink-0'>
                  <div className='flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30'>
                    <svg
                      className='h-5 w-5 text-amber-600 dark:text-amber-400'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className='text-sm font-medium text-amber-900 dark:text-amber-100'>
                    Payment Proof Required
                  </h3>
                  <p className='text-xs text-amber-700 dark:text-amber-300 mt-1'>
                    Your trade is waiting for payment confirmation. Please send your payment
                    receipt/proof to proceed.
                  </p>
                </div>
              </div>
            </div>

            {/* Trade ID */}
            <div className='bg-gray-50 dark:bg-gray-700 p-3 rounded'>
              <p className='text-xs text-gray-600 dark:text-gray-400'>Trade ID:</p>
              <p className='font-mono text-sm text-gray-900 dark:text-white break-all'>
                {tradeCreated}
              </p>
            </div>

            {/* Payment Details Summary */}
            <div className='bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3 space-y-2'>
              <p className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
                Payment Details:
              </p>
              <div className='space-y-1 text-xs'>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Amount:</span>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {currencySymbol} {formatValue(quote.fiat_amount ?? 0)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Method:</span>
                  <span className='font-medium text-gray-900 dark:text-white capitalize'>
                    {selectedPayment}
                  </span>
                </div>
                <div className='flex justify-between border-t border-blue-200 dark:border-blue-700 pt-1'>
                  <span className='text-gray-600 dark:text-gray-400'>Receiving:</span>
                  <span className='font-bold text-blue-600 dark:text-blue-400'>
                    {(quote.crypto_amount ?? 0).toFixed(8)} {quote.symbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3'>
              <p className='text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2'>
                Next Steps:
              </p>
              <ol className='text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside'>
                <li>Send payment using the method above</li>
                <li>Save your payment receipt/proof</li>
                <li>Go to "Support" or "Chat" and upload your proof</li>
                <li>Our team will verify and complete your trade</li>
              </ol>
            </div>

            <button
              onClick={onBack}
              className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            >
              Back to Trading
            </button>
          </div>
        ) : (
          <>
            <TradeStatusMonitor
              tradeId={tradeCreated}
              initialStatus='PENDING'
              onStatusChange={newStatus => {
                if (newStatus === 'COMPLETED') {
                  toast.success('Trade completed successfully!')
                }
              }}
            />
            <button
              onClick={onBack}
              className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            >
              Back to Trading
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
      {/* Header with Back Button */}
      <div className='flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700'>
        <button
          onClick={onBack}
          disabled={loading}
          title='Go back'
          className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50'
        >
          <ArrowLeft className='w-4 h-4 text-gray-600 dark:text-gray-400' />
        </button>
        <div className='flex-1'>
          <h2 className='text-sm font-bold text-gray-900 dark:text-white'>Review Trade</h2>
        </div>
      </div>

      {/* Trade Summary */}
      <div className='space-y-3'>
        {/* Main Layout: Summary + Quote Side by Side */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
          {/* Left Column: Summary Card */}
          <div>
            {/* Summary Card */}
            <div className='bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded p-3 space-y-2'>
              <div className='flex items-center gap-2 mb-2'>
                <div className='h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0'>
                  <CheckCircle className='w-5 h-5 text-white' />
                </div>
                <div>
                  <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                    {isBuy ? 'Buy' : 'Sell'} {quote.symbol}
                  </p>
                </div>
              </div>

              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-700 dark:text-gray-300'>Type:</span>
                  <span className='font-medium text-gray-900 dark:text-white capitalize'>
                    {quote.operation}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-700 dark:text-gray-300'>Asset:</span>
                  <span className='font-medium text-gray-900 dark:text-white'>{quote.symbol}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-700 dark:text-gray-300'>
                    {isBuy ? 'Pay:' : 'Amount:'}
                  </span>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {isBuy
                      ? `${currencySymbol} ${formatValue(quote.fiat_amount ?? 0)}`
                      : `${(quote.crypto_amount ?? 0).toFixed(8)} ${quote.symbol}`}
                  </span>
                </div>
                <div className='flex justify-between border-t border-blue-200 dark:border-blue-700 pt-2'>
                  <span className='font-semibold text-gray-900 dark:text-white'>
                    {isBuy ? 'Receive:' : 'Get:'}
                  </span>
                  <span className='font-bold text-blue-600 dark:text-blue-400'>
                    {isBuy
                      ? `${(quote.crypto_amount ?? 0).toFixed(8)} ${quote.symbol}`
                      : `${currencySymbol} ${formatValue(quote.total_amount ?? 0)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Quote Details (Price breakdown) */}
          <div className='bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded p-3 space-y-2 border border-gray-200 dark:border-gray-700'>
            <p className='text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide'>
              Quote Details
            </p>

            <div className='space-y-1 text-xs'>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>Price:</span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {currencySymbol} {formatValue(quote.crypto_price ?? 0)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>
                  Spread ({quote.spread_percentage ?? 0}%):
                </span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {currencySymbol} {formatValue(quote.spread_amount ?? 0)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>
                  Fee ({quote.network_fee_percentage ?? 0}%):
                </span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {currencySymbol} {formatValue(quote.network_fee_amount ?? 0)}
                </span>
              </div>
              <div className='flex justify-between border-t border-gray-300 dark:border-gray-600 pt-1'>
                <span className='font-semibold text-gray-900 dark:text-white'>Total:</span>
                <span className='font-bold text-blue-600 dark:text-blue-400'>
                  {currencySymbol} {formatValue(quote.total_amount ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <div className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'>
            Payment Method
          </div>
          <div className='grid grid-cols-4 gap-2'>
            {PAYMENT_METHODS.map(method => {
              const IconComponent = method.icon
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  disabled={loading}
                  className={`p-2 rounded border transition-all disabled:opacity-50 text-center ${
                    selectedPayment === method.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <IconComponent className='w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1' />
                  <div className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                    {method.name.split(' ')[0]}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Bank Transfer Details - Conditional Display */}
        {selectedPayment === 'bank_transfer' && (
          <BankDetailsDisplay tradeId={tradeCreated || undefined} />
        )}

        {/* Quote ID Info */}
        <div className='bg-gray-50 dark:bg-gray-700 p-3 rounded text-xs'>
          <span className='text-gray-600 dark:text-gray-400'>ID: </span>
          <span className='font-mono text-gray-900 dark:text-white'>
            {(quote.quote_id ?? '').substring(0, 12)}...
          </span>
        </div>

        {/* Action Buttons - Smaller */}
        <div className='flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700'>
          <button
            onClick={onBack}
            disabled={loading}
            className='px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            Back
          </button>
          <button
            onClick={createTrade}
            disabled={loading}
            className='flex-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors'
          >
            {loading ? (
              <>
                <Loader className='w-3 h-3 animate-spin' />
                <span>Processing</span>
              </>
            ) : (
              <>
                <CheckCircle className='w-3 h-3' />
                <span>Confirm & Continue</span>
              </>
            )}
          </button>
        </div>

        {/* Info Message */}
        <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3 flex items-start gap-2'>
          <CheckCircle className='w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0' />
          <p className='text-xs text-amber-700 dark:text-amber-400'>
            Quote valid 5 min. Once confirmed, trade cannot be reversed.
          </p>
        </div>
      </div>
    </div>
  )
}
