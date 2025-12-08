import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { TradingLimitsDisplay } from './TradingLimitsDisplay'

interface CryptoPrice {
  symbol: string
  name: string
  price: number
  change24h: number
  high24h: number
  low24h: number
}

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

interface TradingFormProps {
  readonly cryptoPrices: readonly CryptoPrice[]
  readonly selectedSymbol: string
  readonly onSymbolChange: (symbol: string) => void
  readonly isBuy: boolean
  readonly onOperationChange: (isBuy: boolean) => void
  readonly onQuoteReceived: (quote: Quote) => void
  readonly currency: string
  readonly convertFromBRL: (value: number) => number
}

const API_BASE = 'http://127.0.0.1:8000/api/v1'

// Crypto logos from CoinGecko (free CDN)
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png?1696504745',
  BNB: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
  TRX: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png?1696502193',
  BASE: 'https://assets.coingecko.com/coins/images/30617/large/base.jpg?1696519330',
  USDT: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661',
  SOL: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756',
  LTC: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png?1696501400',
  DOGE: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1696501400',
  ADA: 'https://assets.coingecko.com/coins/images/975/large/cardano.png?1696502090',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png?1696512369',
  DOT: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png?1696512008',
  LINK: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png?1696502009',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png?1622619446',
  XRP: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442',
}

export function TradingForm({
  cryptoPrices,
  selectedSymbol,
  onSymbolChange,
  isBuy,
  onOperationChange,
  onQuoteReceived,
  currency,
  convertFromBRL,
}: TradingFormProps) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastQuoteTime, setLastQuoteTime] = useState<number>(0)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const QUOTE_VALIDITY_MS = 60000 // 60 segundos

  // Timer para mostrar contagem regressiva
  useEffect(() => {
    if (lastQuoteTime === 0) return

    const updateTimer = () => {
      const now = Date.now()
      const elapsed = now - lastQuoteTime
      const remaining = Math.max(0, Math.ceil((QUOTE_VALIDITY_MS - elapsed) / 1000))
      setSecondsRemaining(remaining)

      if (remaining === 0) {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }

    updateTimer() // Call immediately

    timerRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [lastQuoteTime])

  // Auto-fetch quote with debounce when amount changes
  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // If no valid amount, don't fetch
    if (!amount || Number(amount) <= 0) {
      return
    }

    // Check if we have a recent quote (less than 60 seconds old)
    const now = Date.now()
    const timeSinceLastQuote = now - lastQuoteTime

    if (timeSinceLastQuote < QUOTE_VALIDITY_MS) {
      // Quote is still valid, don't fetch again
      return
    }

    // Set timeout to fetch quote after user stops typing (800ms)
    timeoutRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await axios.post(`${API_BASE}/instant-trade/quote`, {
          operation: isBuy ? 'buy' : 'sell',
          symbol: selectedSymbol,
          [isBuy ? 'fiat_amount' : 'crypto_amount']: Number(amount),
        })
        onQuoteReceived(response.data.quote)
        setLastQuoteTime(Date.now())
      } catch (error: any) {
        // Silently fail for auto-quote - user will see preview
        console.error('Auto-quote error:', error.response?.data?.message)
      } finally {
        setLoading(false)
      }
    }, 800)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [amount, selectedSymbol, isBuy, onQuoteReceived, lastQuoteTime])

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
      <div className='p-4 border-b border-gray-200 dark:border-gray-700 space-y-3'>
        {/* Operation Toggle */}
        <div className='flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1'>
          <button
            onClick={() => {
              onOperationChange(true)
              setAmount('')
            }}
            className={`flex-1 px-2 py-2 rounded text-sm font-medium transition-colors ${
              isBuy
                ? 'bg-green-600 text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => {
              onOperationChange(false)
              setAmount('')
            }}
            className={`flex-1 px-2 py-2 rounded text-sm font-medium transition-colors ${
              isBuy
                ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                : 'bg-red-600 text-white shadow'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Cryptocurrency Selection */}
        <div>
          <label
            htmlFor='crypto-select'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
          >
            Crypto
          </label>
          <div className='relative'>
            <select
              id='crypto-select'
              value={selectedSymbol}
              onChange={e => {
                const newSymbol = e.target.value
                onSymbolChange(newSymbol)
                setAmount('')
                // Reset quote timer to force new quote fetch for the new symbol
                setLastQuoteTime(0)
              }}
              className='w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none'
            >
              {cryptoPrices.map(c => (
                <option key={c.symbol} value={c.symbol}>
                  {c.symbol} - {c.name}
                </option>
              ))}
            </select>
            {/* Logo inside the select */}
            <img
              src={CRYPTO_LOGOS[selectedSymbol] || ''}
              alt={selectedSymbol}
              className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full pointer-events-none'
              onError={e => {
                e.currentTarget.style.display = 'none'
              }}
            />
            {/* Chevron Icon */}
            <svg
              className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 14l-7 7m0 0l-7-7m7 7V3'
              />
            </svg>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            Amount ({isBuy ? currency : selectedSymbol})
          </label>
          <input
            type='number'
            value={amount}
            onChange={e => {
              setAmount(e.target.value)
              // Reset quote if amount is cleared
              if (!e.target.value || e.target.value === '') {
                setLastQuoteTime(0)
              }
            }}
            placeholder='0.00'
            className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />
        </div>

        {/* Status Message when loading */}
        {loading && (
          <div className='flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700'>
            <div className='animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent' />
            <span className='text-xs text-blue-700 dark:text-blue-400'>Fetching quote...</span>
          </div>
        )}

        {/* Quote Valid Timer */}
        {lastQuoteTime > 0 && secondsRemaining > 0 && (
          <div className='flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700'>
            <span className='text-xs text-green-700 dark:text-green-400 font-medium'>
              Quote válida por:
            </span>
            <span className='text-sm font-bold text-green-600 dark:text-green-400'>
              {secondsRemaining}s
            </span>
          </div>
        )}

        {/* Trading Limits Display */}
        {amount &&
          Number(amount) > 0 &&
          (() => {
            let currencySymbol: string
            if (currency === 'BRL') {
              currencySymbol = 'R$'
            } else if (currency === 'USD') {
              currencySymbol = '$'
            } else {
              currencySymbol = '€'
            }
            return (
              <TradingLimitsDisplay
                accountType='PF'
                amount={Number(amount)}
                currency={currency as any}
                convertFromBRL={convertFromBRL}
                dailySpent={0}
                currencySymbol={currencySymbol}
              />
            )
          })()}
      </div>
    </div>
  )
}
