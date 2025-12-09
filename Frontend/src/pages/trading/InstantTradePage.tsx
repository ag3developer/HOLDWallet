import React, { useState, useEffect } from 'react'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { usePrices } from '@/hooks/usePrices'
import { CryptoIcon } from '@/components/CryptoIcon'
import { TradingForm } from './components/TradingForm'
import { QuoteDisplay } from './components/QuoteDisplay'
import { ConfirmationPanel } from './components/ConfirmationPanel'
import { BenefitsSidebar } from './components/BenefitsSidebar'
import { TradeHistoryPanel } from './components/TradeHistoryPanel'
import { ChevronDown, TrendingUp, Zap, Clock, Globe, AlertCircle, Loader2 } from 'lucide-react'

const API_BASE = 'http://127.0.0.1:8000'

// List of supported cryptocurrencies (fixed list)
const SUPPORTED_CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'BNB', name: 'Binance Coin' },
  { symbol: 'XRP', name: 'Ripple' },
  { symbol: 'LINK', name: 'Chainlink' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'LTC', name: 'Litecoin' },
  { symbol: 'SHIB', name: 'Shiba Inu' },
]

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
  return 'EUR'
}

const getCurrencyLocale = (currency: string): string => {
  if (currency === 'BRL') return 'pt-BR'
  if (currency === 'USD') return 'en-US'
  return 'de-DE'
}

export function InstantTradePage() {
  const { currency, convertFromBRL: storeConvertFromBRL } = useCurrencyStore()
  const { token } = useAuthStore()
  const {
    prices: priceData,
    loading: loadingPrices,
    error: priceError,
    refetch,
  } = usePrices(
    SUPPORTED_CRYPTOS.map(c => c.symbol),
    currency
  )
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([])
  const [operation, setOperation] = useState<'buy' | 'sell'>('buy')
  const [symbol, setSymbol] = useState('BTC')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({})
  const [loadingBalances, setLoadingBalances] = useState(true)

  // Fetch wallet balances
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        if (!token) {
          setLoadingBalances(false)
          return
        }

        // Get wallets
        const walletsResp = await fetch('http://127.0.0.1:8000/wallets/', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!walletsResp.ok) throw new Error('Failed to fetch wallets')

        const wallets = await walletsResp.json()
        if (!wallets?.length) {
          setWalletBalances({})
          setLoadingBalances(false)
          return
        }

        const walletId = wallets[0].id

        // Fetch balances
        const balanceResp = await fetch(
          `http://127.0.0.1:8000/wallets/${walletId}/balances?include_tokens=true`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (!balanceResp.ok) throw new Error('Failed to fetch balances')

        const balData = await balanceResp.json()
        const balances: Record<string, number> = {}

        // Map network balances to crypto symbols
        for (const [network, balInfo] of Object.entries(balData.balances || {})) {
          const networkLower = (network as string).toLowerCase()
          let amount = 0

          if (typeof balInfo === 'object' && (balInfo as any)?.balance !== undefined) {
            amount = Number.parseFloat(String((balInfo as any).balance)) || 0
          } else if (typeof balInfo === 'number') {
            amount = balInfo
          }

          // Map network to symbol
          if (networkLower.includes('polygon')) {
            const symbol = networkLower.includes('usdt') ? 'USDT' : 'MATIC'
            balances[symbol] = (balances[symbol] || 0) + amount
          } else if (networkLower === 'base') {
            balances['BASE'] = amount
          } else if (networkLower === 'ethereum' || networkLower === 'eth') {
            balances['ETH'] = amount
          } else if (networkLower === 'bitcoin' || networkLower === 'btc') {
            balances['BTC'] = amount
          } else if (networkLower === 'solana' || networkLower === 'sol') {
            balances['SOL'] = amount
          }
        }

        setWalletBalances(balances)
        setLoadingBalances(false)
      } catch (error) {
        console.error('Error fetching wallet balances:', error)
        setWalletBalances({})
        setLoadingBalances(false)
      }
    }

    fetchBalances()
  }, [token])

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
        setSymbol(prices[0].symbol)
      }
    }
  }, [priceData, symbol, currency])

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

  // Helper to format balance display
  const formatBalance = (value: number): string => {
    if (value === 0) return '0'
    if (value < 0.0001) return value.toFixed(8).replace(/\.?0+$/, '')
    if (value < 1) return value.toFixed(6).replace(/\.?0+$/, '')
    if (value < 1000) return value.toFixed(4).replace(/\.?0+$/, '')
    return value.toFixed(2).replace(/\.?0+$/, '')
  }

  // Get all cryptos with their prices and balances
  const cryptosWithBalances = SUPPORTED_CRYPTOS.map(crypto => {
    const price = cryptoPrices.find(p => p.symbol === crypto.symbol)
    const balance = walletBalances[crypto.symbol] || 0
    return {
      ...crypto,
      price: price?.price || 0,
      balance,
      change24h: price?.change24h || 0,
    }
  })

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

      {/* Error Message */}
      {priceError && (
        <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3'>
          <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0' />
          <div>
            <p className='text-red-700 dark:text-red-300 font-medium'>Erro ao carregar preços</p>
            <p className='text-red-600 dark:text-red-400 text-sm'>{priceError}</p>
          </div>
          <button
            onClick={refetch}
            className='ml-auto px-3 py-1 text-sm font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 rounded transition-colors'
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Loading State */}
      {loadingPrices && loadingBalances ? (
        <div className='p-8 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col items-center justify-center gap-4'>
          <Loader2 className='w-8 h-8 text-blue-600 animate-spin' />
          <p className='text-gray-700 dark:text-gray-300 font-medium'>
            Carregando preços em tempo real...
          </p>
          <p className='text-gray-600 dark:text-gray-400 text-sm'>Conectando ao CoinGecko</p>
        </div>
      ) : (
        <>
          {/* All Supported Cryptos with Prices and Balances - Horizontal Carousel */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              Criptomoedas Disponíveis
            </h2>
            {/* Horizontal scrollable carousel */}
            <div className='overflow-x-auto pb-2 -mx-4 px-4 scroll-smooth'>
              <div className='flex gap-2 min-w-min'>
                {cryptosWithBalances.map(crypto => (
                  <button
                    key={crypto.symbol}
                    onClick={() => setSymbol(crypto.symbol)}
                    className={`flex-shrink-0 w-40 p-3 rounded-lg border-2 transition-all text-left ${
                      symbol === crypto.symbol
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400'
                    }`}
                  >
                    {/* Crypto Icon */}
                    <div className='flex justify-center mb-2'>
                      <CryptoIcon symbol={crypto.symbol} size={28} className='rounded-full' />
                    </div>

                    {/* Crypto Name and Symbol */}
                    <div className='mb-1'>
                      <p className='font-semibold text-gray-900 dark:text-white text-sm text-center'>
                        {crypto.symbol}
                      </p>
                      <p className='text-xs text-gray-600 dark:text-gray-400 text-center truncate'>
                        {crypto.name}
                      </p>
                    </div>

                    {/* Price */}
                    {crypto.price > 0 ? (
                      <div className='mb-1'>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>Preço</p>
                        <p className='font-semibold text-gray-900 dark:text-white text-sm'>
                          {getCurrencySymbol(currency)} {formatBalance(crypto.price)}
                        </p>
                      </div>
                    ) : (
                      <div className='mb-1 animate-pulse'>
                        <div className='h-3 bg-gray-300 dark:bg-gray-600 rounded w-full'></div>
                      </div>
                    )}

                    {/* Change 24h */}
                    {crypto.change24h !== 0 && (
                      <p
                        className={`text-xs font-medium text-center ${
                          crypto.change24h >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {crypto.change24h >= 0 ? '+' : ''}
                        {crypto.change24h.toFixed(2)}%
                      </p>
                    )}

                    {/* Balance */}
                    <div className='mt-2 pt-2 border-t border-gray-200 dark:border-gray-600'>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>Saldo</p>
                      <p className='font-semibold text-gray-900 dark:text-white text-sm truncate'>
                        {loadingBalances ? '...' : formatBalance(crypto.balance)} {crypto.symbol}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {/* Scroll Hint */}
            <p className='text-xs text-gray-500 dark:text-gray-400 mt-2 text-center'>
              ← Deslize para ver mais moedas →
            </p>
          </div>

          {/* Main Trading Area */}
          {showConfirmation && quote ? (
            <ConfirmationPanel
              quote={quote}
              currencySymbol={getCurrencySymbol(currency)}
              currencyLocale={getCurrencyLocale(currency)}
              convertFromBRL={convertFromBRL}
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
                              <span className='font-medium'>Best rates:</span> Higher amounts get
                              better prices
                            </p>
                          </div>

                          <div className='p-2 bg-green-50 dark:bg-green-900/30 rounded border-l-2 border-green-500 flex gap-2'>
                            <Zap className='w-4 h-4 text-green-600 flex-shrink-0 mt-0.5' />
                            <p className='text-gray-700 dark:text-gray-300'>
                              <span className='font-medium'>Fast delivery:</span> Most trades
                              complete in minutes
                            </p>
                          </div>

                          <div className='p-2 bg-amber-50 dark:bg-amber-900/30 rounded border-l-2 border-amber-500 flex gap-2'>
                            <Clock className='w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5' />
                            <p className='text-gray-700 dark:text-gray-300'>
                              <span className='font-medium'>Quote expires:</span> Refresh if quote
                              times out
                            </p>
                          </div>

                          <div className='p-2 bg-purple-50 dark:bg-purple-900/30 rounded border-l-2 border-purple-500 flex gap-2'>
                            <Globe className='w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5' />
                            <p className='text-gray-700 dark:text-gray-300'>
                              <span className='font-medium'>24/7 trading:</span> Trade anytime,
                              every day
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
                            <span className='font-medium'>Best rates:</span> Higher amounts get
                            better prices
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
                            <span className='font-medium'>Quote expires:</span> Refresh if quote
                            times out
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
                            <span className='font-medium'>Best rates:</span> Higher amounts get
                            better prices
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
                            <span className='font-medium'>Quote expires:</span> Refresh if quote
                            times out
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

                {/* Benefits */}
                <BenefitsSidebar />
              </div>
            </div>
          )}
        </>
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
