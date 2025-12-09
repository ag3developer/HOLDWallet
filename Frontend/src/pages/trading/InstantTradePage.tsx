import React, { useState, useEffect } from 'react'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import { usePrices } from '@/hooks/usePrices'
import { TradingForm } from './components/TradingForm'
import { MarketPricesCarousel } from './components/MarketPricesCarousel'
import { QuoteDisplay } from './components/QuoteDisplay'
import { ConfirmationPanel } from './components/ConfirmationPanel'
import { BenefitsSidebar } from './components/BenefitsSidebar'
import { TradeHistoryPanel } from './components/TradeHistoryPanel'
import { ChevronDown, TrendingUp, Zap, Clock, Globe } from 'lucide-react'

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

interface CryptoPrice {
  symbol: string
  name: string
  price: number
  change24h: number
  high24h: number
  low24h: number
}

const getCurrencySymbol = (currency: string): string => {
  if (currency === 'BRL') return 'R$'
  if (currency === 'USD') return '$'
  return '€'
}

const getCurrencyLocale = (currency: string): string => {
  if (currency === 'BRL') return 'pt-BR'
  if (currency === 'USD') return 'en-US'
  return 'de-DE'
}

const SUPPORTED_CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'DOT', name: 'Polkadot' },
]

const generatePriceVariation = (
  basePrice: number
): { change24h: number; high24h: number; low24h: number } => {
  const variation = (Math.random() - 0.5) * 0.08
  const change24h = variation * 100
  const high24h = basePrice * (1 + Math.abs(variation) + 0.02)
  const low24h = basePrice * (1 - Math.abs(variation) - 0.02)
  return { change24h, high24h, low24h }
}

export function InstantTradePage() {
  const { currency, convertFromBRL: storeConvertFromBRL } = useCurrencyStore()
  const { prices: priceData } = usePrices(
    SUPPORTED_CRYPTOS.map(c => c.symbol),
    currency
  )
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([])
  const [operation, setOperation] = useState<'buy' | 'sell'>('buy')
  const [symbol, setSymbol] = useState('BTC')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Update cryptoPrices when hook provides new prices
  useEffect(() => {
    if (Object.keys(priceData).length > 0) {
      const prices = SUPPORTED_CRYPTOS.map(crypto => {
        const priceInfo = priceData[crypto.symbol]
        if (!priceInfo) return null

        return {
          symbol: crypto.symbol,
          name: crypto.name,
          price: priceInfo.price,
          change24h: priceInfo.change_24h,
          high24h: priceInfo.price * 1.05,
          low24h: priceInfo.price * 0.95,
        } as CryptoPrice
      }).filter((p): p is CryptoPrice => p !== null)

      setCryptoPrices(prices)

      // Auto-select first crypto if current not available
      const currentSymbolExists = prices.some(p => p.symbol === symbol)
      if (!currentSymbolExists && prices.length > 0) {
        const firstPrice = prices[0]
        if (firstPrice) {
          setSymbol(firstPrice.symbol)
        }
      }
    }
  }, [priceData, symbol])

  const convertFromBRL = (value: number): number => {
    if (!value || typeof value !== 'number' || Number.isNaN(value)) {
      return 0
    }
    const converted = storeConvertFromBRL(value)
    if (typeof converted !== 'number' || Number.isNaN(converted)) {
      return value
    }
    return converted
  }

  const handleQuoteReceived = (newQuote: Quote) => {
    const currentPrice =
      cryptoPrices.find(p => p.symbol === newQuote.symbol)?.price ?? newQuote.crypto_price
    const updatedQuote = {
      ...newQuote,
      crypto_price: currentPrice,
    }
    setQuote(updatedQuote)
  }

  const handleConfirmSuccess = (tradeId: string) => {
    setShowConfirmation(false)
    setQuote(null)
  }

  // Update quote if price changed
  useEffect(() => {
    if (quote) {
      const currentPrice =
        cryptoPrices.find(p => p.symbol === quote.symbol)?.price ?? quote.crypto_price
      setQuote(prev => (prev ? { ...prev, crypto_price: currentPrice } : null))
    }
  }, [cryptoPrices])

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Instant Trade OTC</h1>
        <p className='text-gray-600 dark:text-gray-400 mt-1'>
          Buy and sell cryptocurrencies instantly with real-time pricing
        </p>
      </div>

      {/* Market Prices Carousel */}
      <MarketPricesCarousel
        cryptoPrices={cryptoPrices}
        selectedSymbol={symbol}
        onSelectSymbol={setSymbol}
        getCurrencySymbol={getCurrencySymbol}
        getCurrencyLocale={getCurrencyLocale}
        convertFromBRL={convertFromBRL}
      />

      {/* Main Trading Area */}
      {showConfirmation && quote ? (
        <ConfirmationPanel
          quote={quote}
          currencySymbol={getCurrencySymbol(currency)}
          currencyLocale={getCurrencyLocale(currency)}
          convertFromBRL={convertFromBRL}
          onBack={() => setShowConfirmation(false)}
          onSuccess={handleConfirmSuccess}
        />
      ) : (
        <div className='space-y-6'>
          {/* Desktop Layout: Side by side */}
          <div className='hidden lg:grid lg:grid-cols-3 gap-6'>
            {/* Left Column: Trading Form */}
            <div className='lg:col-span-1'>
              <TradingForm
                cryptoPrices={cryptoPrices}
                selectedSymbol={symbol}
                onSymbolChange={setSymbol}
                isBuy={operation === 'buy'}
                onOperationChange={isBuy => setOperation(isBuy ? 'buy' : 'sell')}
                onQuoteReceived={handleQuoteReceived}
                currency={currency}
                convertFromBRL={convertFromBRL}
              />
            </div>

            {/* Middle Column: Quote Display */}
            <div className='lg:col-span-1'>
              {quote ? (
                <QuoteDisplay
                  quote={quote}
                  currencySymbol={getCurrencySymbol(currency)}
                  currencyLocale={getCurrencyLocale(currency)}
                  convertFromBRL={convertFromBRL}
                  onConfirmClick={() => setShowConfirmation(true)}
                />
              ) : (
                <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4'>
                  <div className='space-y-3'>
                    <h3 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                      <Zap className='w-4 h-4' /> Quick Tips
                    </h3>

                    <div className='space-y-2 text-xs'>
                      <div className='p-2 bg-blue-50 dark:bg-blue-900/30 rounded border-l-2 border-blue-500 flex gap-2'>
                        <TrendingUp className='w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5' />
                        <p className='text-gray-700 dark:text-gray-300'>
                          <span className='font-medium'>Best rates:</span> Higher amounts get better
                          prices
                        </p>
                      </div>

                      <div className='p-2 bg-green-50 dark:bg-green-900/30 rounded border-l-2 border-green-500 flex gap-2'>
                        <Zap className='w-4 h-4 text-green-600 flex-shrink-0 mt-0.5' />
                        <p className='text-gray-700 dark:text-gray-300'>
                          <span className='font-medium'>Fast delivery:</span> Most trades complete
                          in minutes
                        </p>
                      </div>

                      <div className='p-2 bg-amber-50 dark:bg-amber-900/30 rounded border-l-2 border-amber-500 flex gap-2'>
                        <Clock className='w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5' />
                        <p className='text-gray-700 dark:text-gray-300'>
                          <span className='font-medium'>Quote expires:</span> Refresh if quote times
                          out
                        </p>
                      </div>

                      <div className='p-2 bg-purple-50 dark:bg-purple-900/30 rounded border-l-2 border-purple-500 flex gap-2'>
                        <Globe className='w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5' />
                        <p className='text-gray-700 dark:text-gray-300'>
                          <span className='font-medium'>24/7 trading:</span> Trade anytime, every
                          day
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Benefits Sidebar */}
            <div className='lg:col-span-1'>
              <BenefitsSidebar />
            </div>
          </div>

          {/* Tablet Layout: Stacked */}
          <div className='hidden md:block lg:hidden space-y-6'>
            {/* Trading Form */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
              <TradingForm
                cryptoPrices={cryptoPrices}
                selectedSymbol={symbol}
                onSymbolChange={setSymbol}
                isBuy={operation === 'buy'}
                onOperationChange={isBuy => setOperation(isBuy ? 'buy' : 'sell')}
                onQuoteReceived={handleQuoteReceived}
                currency={currency}
                convertFromBRL={convertFromBRL}
              />
            </div>

            {/* Quote or Tips */}
            {quote ? (
              <QuoteDisplay
                quote={quote}
                currencySymbol={getCurrencySymbol(currency)}
                currencyLocale={getCurrencyLocale(currency)}
                convertFromBRL={convertFromBRL}
                onConfirmClick={() => setShowConfirmation(true)}
              />
            ) : (
              <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4'>
                <div className='space-y-3'>
                  <h3 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                    <Zap className='w-4 h-4' /> Quick Tips
                  </h3>
                  <div className='space-y-2 text-xs'>
                    <div className='p-2 bg-blue-50 dark:bg-blue-900/30 rounded border-l-2 border-blue-500 flex gap-2'>
                      <TrendingUp className='w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5' />
                      <p className='text-gray-700 dark:text-gray-300'>
                        <span className='font-medium'>Best rates:</span> Higher amounts get better
                        prices
                      </p>
                    </div>
                    <div className='p-2 bg-green-50 dark:bg-green-900/30 rounded border-l-2 border-green-500 flex gap-2'>
                      <Zap className='w-4 h-4 text-green-600 flex-shrink-0 mt-0.5' />
                      <p className='text-gray-700 dark:text-gray-300'>
                        <span className='font-medium'>Fast delivery:</span> Most trades complete in
                        minutes
                      </p>
                    </div>
                    <div className='p-2 bg-amber-50 dark:bg-amber-900/30 rounded border-l-2 border-amber-500 flex gap-2'>
                      <Clock className='w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5' />
                      <p className='text-gray-700 dark:text-gray-300'>
                        <span className='font-medium'>Quote expires:</span> Refresh if quote times
                        out
                      </p>
                    </div>
                    <div className='p-2 bg-purple-50 dark:bg-purple-900/30 rounded border-l-2 border-purple-500 flex gap-2'>
                      <Globe className='w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5' />
                      <p className='text-gray-700 dark:text-gray-300'>
                        <span className='font-medium'>24/7 trading:</span> Trade anytime, every day
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Benefits */}
            <BenefitsSidebar />
          </div>

          {/* Mobile Layout: Full width stacked */}
          <div className='md:hidden space-y-6'>
            {/* Trading Form */}
            <TradingForm
              cryptoPrices={cryptoPrices}
              selectedSymbol={symbol}
              onSymbolChange={setSymbol}
              isBuy={operation === 'buy'}
              onOperationChange={isBuy => setOperation(isBuy ? 'buy' : 'sell')}
              onQuoteReceived={handleQuoteReceived}
              currency={currency}
              convertFromBRL={convertFromBRL}
            />

            {/* Quote or Tips */}
            {quote ? (
              <QuoteDisplay
                quote={quote}
                currencySymbol={getCurrencySymbol(currency)}
                currencyLocale={getCurrencyLocale(currency)}
                convertFromBRL={convertFromBRL}
                onConfirmClick={() => setShowConfirmation(true)}
              />
            ) : (
              <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4'>
                <div className='space-y-3'>
                  <h3 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                    <Zap className='w-4 h-4' /> Quick Tips
                  </h3>
                  <div className='space-y-2 text-xs'>
                    <div className='p-2 bg-blue-50 dark:bg-blue-900/30 rounded border-l-2 border-blue-500 flex gap-2'>
                      <TrendingUp className='w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5' />
                      <p className='text-gray-700 dark:text-gray-300'>
                        <span className='font-medium'>Best rates:</span> Higher amounts get better
                        prices
                      </p>
                    </div>
                    <div className='p-2 bg-green-50 dark:bg-green-900/30 rounded border-l-2 border-green-500 flex gap-2'>
                      <Zap className='w-4 h-4 text-green-600 flex-shrink-0 mt-0.5' />
                      <p className='text-gray-700 dark:text-gray-300'>
                        <span className='font-medium'>Fast delivery:</span> Most trades complete in
                        minutes
                      </p>
                    </div>
                    <div className='p-2 bg-amber-50 dark:bg-amber-900/30 rounded border-l-2 border-amber-500 flex gap-2'>
                      <Clock className='w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5' />
                      <p className='text-gray-700 dark:text-gray-300'>
                        <span className='font-medium'>Quote expires:</span> Refresh if quote times
                        out
                      </p>
                    </div>
                    <div className='p-2 bg-purple-50 dark:bg-purple-900/30 rounded border-l-2 border-purple-500 flex gap-2'>
                      <Globe className='w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5' />
                      <p className='text-gray-700 dark:text-gray-300'>
                        <span className='font-medium'>24/7 trading:</span> Trade anytime, every day
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Benefits */}
            <BenefitsSidebar />
          </div>
        </div>
      )}

      {/* Trade History Section */}
      <div className='border-t border-gray-200 dark:border-gray-700 pt-6'>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className='w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
        >
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Historico de Trades
          </h2>
          <ChevronDown
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
              showHistory ? 'rotate-180' : ''
            }`}
          />
        </button>
        {showHistory && (
          <div className='mt-2'>
            <TradeHistoryPanel
              currencySymbol={getCurrencySymbol(currency)}
              currencyLocale={getCurrencyLocale(currency)}
              isVisible={showHistory}
            />
          </div>
        )}
      </div>
    </div>
  )
}
