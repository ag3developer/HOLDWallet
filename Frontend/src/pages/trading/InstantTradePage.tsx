import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import { usePrices } from '@/hooks/usePrices'
import { TradingForm } from './components/TradingForm'
import { MarketPricesCarousel } from './components/MarketPricesCarousel'
import { QuoteDisplay } from './components/QuoteDisplay'
import { ConfirmationPanel, TradeData } from './components/ConfirmationPanel'
import { BenefitsSidebar } from './components/BenefitsSidebar'
import { TradeHistoryPanel } from './components/TradeHistoryPanel'
import { TradeDetailsPage } from './components/TradeDetailsPage'
import {
  ChevronDown,
  TrendingUp,
  Zap,
  Clock,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Shield,
  History,
  Activity,
  Flame,
  BarChart3,
  Wallet,
  RefreshCw,
} from 'lucide-react'

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
  // 🪙 MOEDAS NATIVAS (15 blockchains)
  { symbol: 'BTC', name: 'Bitcoin', category: 'Native' },
  { symbol: 'ETH', name: 'Ethereum', category: 'Native' },
  { symbol: 'MATIC', name: 'Polygon', category: 'Native' },
  { symbol: 'BNB', name: 'Binance Smart Chain', category: 'Native' },
  { symbol: 'TRX', name: 'TRON', category: 'Native' },
  { symbol: 'SOL', name: 'Solana', category: 'Native' },
  { symbol: 'LTC', name: 'Litecoin', category: 'Native' },
  { symbol: 'DOGE', name: 'Dogecoin', category: 'Native' },
  { symbol: 'ADA', name: 'Cardano', category: 'Native' },
  { symbol: 'AVAX', name: 'Avalanche', category: 'Native' },
  { symbol: 'DOT', name: 'Polkadot', category: 'Native' },
  { symbol: 'LINK', name: 'Chainlink', category: 'Native' },
  { symbol: 'SHIB', name: 'Shiba Inu', category: 'Native' },
  { symbol: 'XRP', name: 'XRP', category: 'Native' },

  // 💵 STABLECOINS (Criptodólares)
  { symbol: 'USDT', name: 'Tether USD', category: 'Stablecoin' },
  { symbol: 'USDC', name: 'USD Coin', category: 'Stablecoin' },
  { symbol: 'DAI', name: 'Dai Stablecoin', category: 'Stablecoin' },
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
  const { t, i18n } = useTranslation()
  const { currency } = useCurrencyStore()
  // ⚠️ IMPORTANTE: Sempre buscar preços em USD!
  // O formatCurrency do useCurrencyStore converte USD → moeda do usuário
  // Se buscar em BRL e depois usar formatCurrency, o valor será multiplicado 2x
  const { prices: priceData } = usePrices(
    SUPPORTED_CRYPTOS.map(c => c.symbol),
    'USD'
  )

  // Inicializar com SUPPORTED_CRYPTOS para garantir que as moedas apareçam mesmo antes dos preços carregarem
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>(() =>
    SUPPORTED_CRYPTOS.map(crypto => ({
      symbol: crypto.symbol,
      name: crypto.name,
      price: 0,
      change24h: 0,
      high24h: 0,
      low24h: 0,
    }))
  )
  const [operation, setOperation] = useState<'buy' | 'sell'>('buy')
  const [symbol, setSymbol] = useState('BTC')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null) // Nova trade criada
  const [initialTradeData, setInitialTradeData] = useState<TradeData | null>(null) // Dados iniciais para render rápido

  // Update cryptoPrices when hook provides new prices
  useEffect(() => {
    // Verificar se temos dados de preço válidos
    if (!priceData || Object.keys(priceData).length === 0) {
      return
    }

    console.log('[InstantTradePage] priceData received from usePrices:', priceData)

    // Mapear dados de preço para CryptoPrice com fallback seguro
    const prices: CryptoPrice[] = []

    for (const crypto of SUPPORTED_CRYPTOS) {
      const priceInfo = priceData[crypto.symbol]

      // Se não tiver preço, usar um valor padrão para manter a moeda na lista
      if (priceInfo) {
        const price = priceInfo.price || 0
        const change24h = priceInfo.change_24h || 0

        console.log(`[InstantTradePage] ${crypto.symbol}: price=${price}, change=${change24h}%`)

        prices.push({
          symbol: crypto.symbol,
          name: crypto.name,
          price: price,
          change24h: change24h,
          high24h: priceInfo.high_24h || 0, // Use real backend data if available
          low24h: priceInfo.low_24h || 0, // Use real backend data if available
        })
      } else {
        // Manter a moeda mesmo sem preço atual (vai carregar em breve)
        prices.push({
          symbol: crypto.symbol,
          name: crypto.name,
          price: 0,
          change24h: 0,
          high24h: 0,
          low24h: 0,
        })
      }
    }

    console.log('[InstantTradePage] cryptoPrices state updated:', prices)
    // Atualizar lista de preços
    setCryptoPrices(prices)

    // Auto-select primeiro crypto apenas se não há seleção válida
    // Usar um ref para evitar re-renders infinitos
    if (!symbol || !prices.some(p => p.symbol === symbol)) {
      if (prices.length > 0) {
        setSymbol(prices[0]?.symbol || 'BTC')
      }
    }
  }, [priceData]) // IMPORTANTE: Remover 'symbol' da dependência para evitar loops

  const convertFromBRL = (value: number): number => {
    // ⚠️ IMPORTANTE: Os preços já vêm convertidos do PriceService!
    // O PriceService.parseResponse() já converte USD → currency selecionada
    // Esta função agora é apenas uma função de passagem para compatibilidade

    if (!value || typeof value !== 'number' || Number.isNaN(value)) {
      return 0
    }

    // Retornar valor diretamente - a conversão já foi feita no PriceService
    return value
  }

  const handleQuoteReceived = (newQuote: Quote) => {
    // Backend já retorna crypto_price correto em USD
    // NÃO sobrescrever com preços locais que estão em outra moeda!
    setQuote(newQuote)
  }

  const handleConfirmSuccess = (tradeId: string, tradeData?: TradeData) => {
    setShowConfirmation(false)
    setQuote(null)
    // Armazenar dados da trade para renderização instantânea
    if (tradeData) {
      setInitialTradeData(tradeData)
    }
    // Redirecionar para a página de detalhes da trade criada
    setSelectedTradeId(tradeId)
  }

  // Voltar da página de detalhes para o formulário
  const handleBackFromDetails = () => {
    setSelectedTradeId(null)
    setInitialTradeData(null)
  }

  const handleRefreshQuote = () => {
    // Go back to trading form to get a new quote
    setShowConfirmation(false)
    setQuote(null)
  }

  // Update quote if price changed
  useEffect(() => {
    if (quote) {
      // Backend gerencia os preços em USD, não precisamos atualizar aqui
      // O countdown do quote_id já garante que preços antigos expiram
    }
  }, [cryptoPrices])

  // Se há uma trade selecionada, mostrar página de detalhes
  if (selectedTradeId) {
    return (
      <div className='space-y-6'>
        {/* Header */}
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            {t('instantTrade.title')} OTC
          </h1>
          <p className='text-gray-600 dark:text-gray-400 mt-1'>{t('instantTrade.orderDetails')}</p>
        </div>

        <TradeDetailsPage
          tradeId={selectedTradeId}
          onBack={handleBackFromDetails}
          initialData={initialTradeData as unknown as Record<string, unknown> | undefined}
        />
      </div>
    )
  }

  return (
    <div className='space-y-6' key={i18n.language}>
      {/* Clean Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <div className='flex items-center gap-3 mb-1'>
            <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>
              {t('instantTrade.title')}
            </h1>
            <div className='flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 rounded-full'>
              <span className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
              <span className='text-xs font-medium text-green-700 dark:text-green-400'>
                {t('instantTrade.live')}
              </span>
            </div>
          </div>
          <p className='text-gray-500 dark:text-gray-400 text-sm'>{t('instantTrade.subtitle')}</p>
        </div>

        {/* Stats Pills */}
        <div className='flex gap-2'>
          <div className='flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm'>
            <Activity className='w-4 h-4 text-blue-500' />
            <div>
              <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                {t('instantTrade.volume24h')}
              </p>
              <p className='text-sm font-bold text-gray-900 dark:text-white'>$2.4M</p>
            </div>
          </div>
          <div className='flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm'>
            <Flame className='w-4 h-4 text-orange-500' />
            <div>
              <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                {t('instantTrade.trades')}
              </p>
              <p className='text-sm font-bold text-gray-900 dark:text-white'>847</p>
            </div>
          </div>
        </div>
      </div>

      {/* Market Prices Carousel */}
      <MarketPricesCarousel
        cryptoPrices={cryptoPrices}
        selectedSymbol={symbol}
        onSelectSymbol={setSymbol}
      />

      {/* Main Trading Area */}
      {showConfirmation && quote ? (
        <ConfirmationPanel
          quote={quote}
          onBack={() => setShowConfirmation(false)}
          onSuccess={handleConfirmSuccess}
          onRefreshQuote={handleRefreshQuote}
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
                <QuoteDisplay quote={quote} onConfirmClick={() => setShowConfirmation(true)} />
              ) : (
                <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6'>
                  <div className='flex items-center gap-2 mb-4'>
                    <div className='p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl'>
                      <Sparkles className='w-5 h-5 text-white' />
                    </div>
                    <div>
                      <h3 className='font-bold text-gray-900 dark:text-white'>
                        {t('instantTrade.quickTips')}
                      </h3>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {t('instantTrade.maximizeGains')}
                      </p>
                    </div>
                  </div>

                  <div className='space-y-3'>
                    <div className='group p-3 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 rounded-xl border-l-4 border-blue-500 hover:scale-[1.02] transition-transform cursor-default'>
                      <div className='flex items-start gap-3'>
                        <div className='p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg'>
                          <TrendingUp className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                        </div>
                        <div>
                          <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                            {t('instantTrade.bestRates')}
                          </p>
                          <p className='text-xs text-gray-600 dark:text-gray-400'>
                            {t('instantTrade.bestRatesDesc')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className='group p-3 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20 rounded-xl border-l-4 border-green-500 hover:scale-[1.02] transition-transform cursor-default'>
                      <div className='flex items-start gap-3'>
                        <div className='p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg'>
                          <Zap className='w-4 h-4 text-green-600 dark:text-green-400' />
                        </div>
                        <div>
                          <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                            {t('instantTrade.fastExecution')}
                          </p>
                          <p className='text-xs text-gray-600 dark:text-gray-400'>
                            {t('instantTrade.fastExecutionDesc')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className='group p-3 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/20 rounded-xl border-l-4 border-amber-500 hover:scale-[1.02] transition-transform cursor-default'>
                      <div className='flex items-start gap-3'>
                        <div className='p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg'>
                          <Clock className='w-4 h-4 text-amber-600 dark:text-amber-400' />
                        </div>
                        <div>
                          <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                            {t('instantTrade.quoteExpires')}
                          </p>
                          <p className='text-xs text-gray-600 dark:text-gray-400'>
                            {t('instantTrade.quoteExpiresDesc')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className='group p-3 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 rounded-xl border-l-4 border-purple-500 hover:scale-[1.02] transition-transform cursor-default'>
                      <div className='flex items-start gap-3'>
                        <div className='p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg'>
                          <Globe className='w-4 h-4 text-purple-600 dark:text-purple-400' />
                        </div>
                        <div>
                          <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                            {t('instantTrade.trading247')}
                          </p>
                          <p className='text-xs text-gray-600 dark:text-gray-400'>
                            {t('instantTrade.trading247Desc')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Badge */}
                  <div className='mt-4 pt-4 border-t border-gray-100 dark:border-gray-700'>
                    <div className='flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400'>
                      <Shield className='w-4 h-4 text-green-500' />
                      <span>{t('instantTrade.secureTransactions')}</span>
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
              <QuoteDisplay quote={quote} onConfirmClick={() => setShowConfirmation(true)} />
            ) : (
              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-5 space-y-4'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-md'>
                    <Zap className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <h3 className='font-bold text-gray-900 dark:text-white'>
                      {t('instantTrade.quickTips')}
                    </h3>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {t('instantTrade.maximizeGains')}
                    </p>
                  </div>
                </div>
                <div className='space-y-3'>
                  <div className='group p-3 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 rounded-xl border-l-4 border-blue-500 hover:scale-[1.02] transition-transform'>
                    <div className='flex items-start gap-3'>
                      <div className='p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg'>
                        <TrendingUp className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                      </div>
                      <div>
                        <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                          {t('instantTrade.bestRates')}
                        </p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>
                          {t('instantTrade.bestRatesDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='group p-3 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20 rounded-xl border-l-4 border-green-500 hover:scale-[1.02] transition-transform'>
                    <div className='flex items-start gap-3'>
                      <div className='p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg'>
                        <Zap className='w-4 h-4 text-green-600 dark:text-green-400' />
                      </div>
                      <div>
                        <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                          {t('instantTrade.fastExecution')}
                        </p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>
                          {t('instantTrade.fastExecutionDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='group p-3 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/20 rounded-xl border-l-4 border-amber-500 hover:scale-[1.02] transition-transform'>
                    <div className='flex items-start gap-3'>
                      <div className='p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg'>
                        <Clock className='w-4 h-4 text-amber-600 dark:text-amber-400' />
                      </div>
                      <div>
                        <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                          {t('instantTrade.quoteExpires')}
                        </p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>
                          {t('instantTrade.quoteExpiresDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='group p-3 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 rounded-xl border-l-4 border-purple-500 hover:scale-[1.02] transition-transform'>
                    <div className='flex items-start gap-3'>
                      <div className='p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg'>
                        <Globe className='w-4 h-4 text-purple-600 dark:text-purple-400' />
                      </div>
                      <div>
                        <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                          {t('instantTrade.trading247')}
                        </p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>
                          {t('instantTrade.trading247Desc')}
                        </p>
                      </div>
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
              <QuoteDisplay quote={quote} onConfirmClick={() => setShowConfirmation(true)} />
            ) : (
              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-5 space-y-4'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-md'>
                    <Zap className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <h3 className='font-bold text-gray-900 dark:text-white'>
                      {t('instantTrade.quickTips')}
                    </h3>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {t('instantTrade.maximizeGains')}
                    </p>
                  </div>
                </div>
                <div className='space-y-3'>
                  <div className='group p-3 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 rounded-xl border-l-4 border-blue-500 hover:scale-[1.02] transition-transform'>
                    <div className='flex items-start gap-3'>
                      <div className='p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg'>
                        <TrendingUp className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                      </div>
                      <div>
                        <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                          {t('instantTrade.bestRates')}
                        </p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>
                          {t('instantTrade.bestRatesDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='group p-3 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20 rounded-xl border-l-4 border-green-500 hover:scale-[1.02] transition-transform'>
                    <div className='flex items-start gap-3'>
                      <div className='p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg'>
                        <Zap className='w-4 h-4 text-green-600 dark:text-green-400' />
                      </div>
                      <div>
                        <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                          {t('instantTrade.fastExecution')}
                        </p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>
                          {t('instantTrade.fastExecutionDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='group p-3 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/20 rounded-xl border-l-4 border-amber-500 hover:scale-[1.02] transition-transform'>
                    <div className='flex items-start gap-3'>
                      <div className='p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg'>
                        <Clock className='w-4 h-4 text-amber-600 dark:text-amber-400' />
                      </div>
                      <div>
                        <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                          {t('instantTrade.quoteExpires')}
                        </p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>
                          {t('instantTrade.quoteExpiresDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='group p-3 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 rounded-xl border-l-4 border-purple-500 hover:scale-[1.02] transition-transform'>
                    <div className='flex items-start gap-3'>
                      <div className='p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg'>
                        <Globe className='w-4 h-4 text-purple-600 dark:text-purple-400' />
                      </div>
                      <div>
                        <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                          {t('instantTrade.trading247')}
                        </p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>
                          {t('instantTrade.trading247Desc')}
                        </p>
                      </div>
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
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden'>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className='w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
        >
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md'>
              <History className='w-5 h-5 text-white' />
            </div>
            <div className='text-left'>
              <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
                {t('instantTrade.tradeHistory')}
              </h2>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {t('instantTrade.previousTrades')}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${
              showHistory ? 'rotate-180' : ''
            }`}
          />
        </button>
        {showHistory && (
          <div className='border-t border-gray-100 dark:border-gray-700'>
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
