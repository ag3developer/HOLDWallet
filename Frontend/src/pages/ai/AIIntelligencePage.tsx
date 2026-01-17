import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Brain,
  Target,
  GitBranch,
  ArrowRightLeft,
  Activity,
  RefreshCw,
  Loader2,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Zap,
  Shield,
  BarChart3,
  Cpu,
  Lightbulb,
  Rocket,
  Eye,
  WifiOff,
  Clock,
} from 'lucide-react'
import {
  AIInsightsCard,
  ATHAnalysis,
  CorrelationMatrix,
  SwapSuggestions,
  TechnicalIndicators,
} from '@/components/ai'
import { CryptoIcon } from '@/components/CryptoIcon'
import {
  aiService,
  PortfolioAsset,
  ATHAnalysis as ATHAnalysisType,
  CorrelationResult,
  SwapSuggestionsResult,
  TechnicalIndicators as TechnicalIndicatorsType,
} from '@/services/aiService'
import { apiClient } from '@/services/api'
import { useCurrencyStore } from '@/stores/useCurrencyStore'

type TabType = 'overview' | 'ath' | 'correlation' | 'swap' | 'indicators'

interface AIIntelligencePageProps {
  onBack?: () => void
}

interface TabButtonProps {
  active: boolean
  icon: React.ElementType
  label: string
  onClick: () => void
}

const TabButton: React.FC<TabButtonProps> = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
      active
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
        : 'bg-white dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700'
    }`}
  >
    <Icon className={`w-4 h-4 ${active ? 'text-white' : ''}`} />
    <span className='text-sm font-medium hidden sm:inline'>{label}</span>
  </button>
)

// Helper to check if error is timeout-related
const isTimeoutErr = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('took too long') ||
      (error as any).code === 'TIMEOUT_ERROR' ||
      (error as any).code === 'ECONNABORTED'
    )
  }
  return false
}

// Helper to get user-friendly error message
const getErrorMsg = (error: unknown): string => {
  if (isTimeoutErr(error)) {
    return 'O servidor está demorando para responder. Isso pode acontecer em horários de pico.'
  }
  if (error instanceof Error) {
    if (error.message.includes('Network Error') || error.message.includes('ERR_NETWORK')) {
      return 'Sem conexão com o servidor. Verifique sua internet.'
    }
  }
  return 'Erro ao carregar dados. Tente novamente.'
}

const AIIntelligencePage: React.FC<AIIntelligencePageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Currency store - for displaying values in user's preferred currency
  const { formatCurrency } = useCurrencyStore()

  // Real data states
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([])
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({})
  const [ohlcvData, setOhlcvData] = useState<Record<string, any>>({})

  // Analysis data states
  const [athData, setAthData] = useState<ATHAnalysisType[] | null>(null)
  const [correlationData, setCorrelationData] = useState<CorrelationResult | null>(null)
  const [swapData, setSwapData] = useState<SwapSuggestionsResult | null>(null)
  const [indicatorsData, setIndicatorsData] = useState<TechnicalIndicatorsType | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState('BTC')

  // Error states
  const [athError, setAthError] = useState<string | null>(null)
  const [correlationError, setCorrelationError] = useState<string | null>(null)
  const [swapError, setSwapError] = useState<string | null>(null)
  const [indicatorsError, setIndicatorsError] = useState<string | null>(null)
  const [dataLoadError, setDataLoadError] = useState<string | null>(null)
  const [isTimeoutError, setIsTimeoutError] = useState(false)

  // Retry tracking
  const retryCountRef = useRef(0)
  const MAX_RETRIES = 2

  // ===================
  // Fetch Real Portfolio from User's Wallet (with retry logic)
  // ===================
  const fetchRealPortfolio = useCallback(async (retry = 0): Promise<PortfolioAsset[]> => {
    try {
      // Get user's wallets with increased timeout for slow connections
      const walletsResp = await apiClient.get('/wallets/', {
        timeout: 45000, // 45 seconds for AI page
      })
      const wallets = walletsResp.data
      if (!wallets?.length) return []

      const walletId = wallets[0].id

      // Get balances with tokens
      const balanceResp = await apiClient.get(`/wallets/${walletId}/balances?include_tokens=true`, {
        timeout: 45000,
      })
      const balances = balanceResp.data.balances || {}

      // Get current prices
      const pricesResp = await apiClient.get('/prices/batch', {
        params: { symbols: 'BTC,ETH,SOL,MATIC,BNB,ADA,DOT,LINK,AVAX,LTC,DOGE,XRP,TRX' },
        timeout: 30000,
      })
      const prices = pricesResp.data.prices || {}

      // Map network to symbol
      const networkToSymbol: Record<string, string> = {
        bitcoin: 'BTC',
        ethereum: 'ETH',
        polygon: 'MATIC',
        solana: 'SOL',
        bsc: 'BNB',
        cardano: 'ADA',
        polkadot: 'DOT',
        avalanche: 'AVAX',
        litecoin: 'LTC',
        dogecoin: 'DOGE',
        tron: 'TRX',
        base: 'BASE',
      }

      const portfolioAssets: PortfolioAsset[] = []

      for (const [network, balInfo] of Object.entries(balances)) {
        const networkLower = network.toLowerCase()
        // Skip duplicates
        if (networkLower === 'matic' || networkLower === 'pol') continue

        const symbol = networkToSymbol[networkLower]
        if (!symbol) continue

        const balance =
          typeof balInfo === 'object' && (balInfo as any).balance
            ? Number.parseFloat((balInfo as any).balance)
            : typeof balInfo === 'number'
              ? balInfo
              : 0

        if (balance <= 0) continue

        const priceData = prices[symbol]
        const currentPrice = priceData?.price || 0
        const valueUsd = balance * currentPrice

        if (valueUsd >= 1) {
          // Only include if >= $1
          portfolioAssets.push({
            symbol,
            amount: balance,
            current_price: currentPrice,
            value_usd: valueUsd,
          })
        }
      }

      // Sort by value descending
      portfolioAssets.sort((a, b) => b.value_usd - a.value_usd)
      return portfolioAssets
    } catch (error) {
      console.error('Error fetching real portfolio:', error)

      // Auto-retry on timeout (up to MAX_RETRIES)
      if (isTimeoutErr(error) && retry < MAX_RETRIES) {
        console.log(`[AI] Retrying portfolio fetch (attempt ${retry + 1}/${MAX_RETRIES})...`)
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds before retry
        return fetchRealPortfolio(retry + 1)
      }

      // Track timeout errors for UI feedback
      if (isTimeoutErr(error)) {
        setIsTimeoutError(true)
      }

      return []
    }
  }, [])

  // ===================
  // Fetch Real Price History for Correlation
  // ===================
  const fetchRealPriceHistory = useCallback(
    async (symbols: string[]): Promise<Record<string, number[]>> => {
      try {
        if (symbols.length === 0) return {}

        const response = await aiService.getPriceHistory(symbols, 30)
        return response.price_history || {}
      } catch (error) {
        console.error('Error fetching price history:', error)
        return {}
      }
    },
    []
  )

  // ===================
  // Fetch Real OHLCV Data for Indicators
  // ===================
  const fetchRealOHLCV = useCallback(async (symbol: string) => {
    try {
      const response = await aiService.getOHLCV(symbol, '1d', 100)
      return response.ohlcv
    } catch (error) {
      console.error(`Error fetching OHLCV for ${symbol}:`, error)
      return null
    }
  }, [])

  // ===================
  // Fetch All Real Data
  // ===================
  const fetchAllData = useCallback(async () => {
    setLoading(true)
    setDataLoadError(null)
    setAthError(null)
    setCorrelationError(null)
    setSwapError(null)
    setIndicatorsError(null)

    try {
      // 1. Fetch real portfolio from user's wallet
      console.log('[AI] Fetching real portfolio...')
      const realPortfolio = await fetchRealPortfolio()
      setPortfolio(realPortfolio)
      console.log('[AI] Portfolio loaded:', realPortfolio.length, 'assets')

      if (realPortfolio.length === 0) {
        setDataLoadError(
          'Nenhum ativo encontrado no seu portfolio. Deposite cripto para usar a AI Intelligence.'
        )
        setLoading(false)
        return
      }

      // 2. Fetch price history for correlation (all portfolio symbols + BTC, ETH)
      const symbolsForHistory = Array.from(
        new Set([
          ...realPortfolio.map(a => a.symbol),
          'BTC',
          'ETH',
          'SOL', // Always include major coins for correlation
        ])
      )
      console.log('[AI] Fetching price history for:', symbolsForHistory)
      const history = await fetchRealPriceHistory(symbolsForHistory)
      setPriceHistory(history)

      // 3. Fetch ATH data for all portfolio assets
      console.log('[AI] Fetching ATH data...')
      const athPromises = realPortfolio.map(asset =>
        aiService.getATHAnalysis(asset.symbol, asset.current_price).catch(err => {
          console.error(`ATH error for ${asset.symbol}:`, err)
          return null
        })
      )
      const athResults = await Promise.all(athPromises)
      const validAthResults = athResults.filter((r): r is ATHAnalysisType => r !== null)
      setAthData(validAthResults.length > 0 ? validAthResults : null)
      if (validAthResults.length === 0) {
        setAthError('Não foi possível carregar dados ATH')
      }

      // 4. Fetch correlation data using real price history
      console.log('[AI] Calculating correlations...')
      if (Object.keys(history).length >= 2) {
        try {
          const correlationResult = await aiService.getCorrelation(history, 30)
          setCorrelationData(correlationResult)
        } catch (err) {
          console.error('Correlation error:', err)
          setCorrelationError('Falha ao calcular correlações')
        }
      } else {
        setCorrelationError('Dados insuficientes para correlação')
      }

      // 5. Fetch swap suggestions
      console.log('[AI] Getting swap suggestions...')
      try {
        const swapResult = await aiService.getSwapSuggestions(realPortfolio)
        setSwapData(swapResult)
      } catch (err) {
        console.error('Swap error:', err)
        setSwapError('Falha ao obter sugestões de swap')
      }

      // 6. Fetch OHLCV for technical indicators (default BTC or first portfolio asset)
      const indicatorSymbol = realPortfolio[0]?.symbol || 'BTC'
      setSelectedSymbol(indicatorSymbol)
      console.log('[AI] Fetching OHLCV for:', indicatorSymbol)
      try {
        const ohlcv = await fetchRealOHLCV(indicatorSymbol)
        if (ohlcv) {
          setOhlcvData({ [indicatorSymbol]: ohlcv })
          const indicatorsResult = await aiService.getTechnicalIndicators(indicatorSymbol, ohlcv)
          setIndicatorsData(indicatorsResult)
        } else {
          setIndicatorsError('Falha ao carregar dados OHLCV')
        }
      } catch (err) {
        console.error('Indicators error:', err)
        setIndicatorsError('Falha ao calcular indicadores')
      }
    } catch (error) {
      console.error('[AI] Error loading data:', error)

      // Set appropriate error message based on error type
      if (isTimeoutErr(error)) {
        setIsTimeoutError(true)
        setDataLoadError('O servidor está demorando. Tente novamente em alguns segundos.')
      } else {
        setDataLoadError(getErrorMsg(error))
      }
    }

    // Reset retry count on successful completion or final failure
    retryCountRef.current = 0
    setLoading(false)
  }, [fetchRealPortfolio, fetchRealPriceHistory, fetchRealOHLCV])

  // Initial fetch
  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Refresh handler with reset of error states
  const handleRefresh = async () => {
    setRefreshing(true)
    setIsTimeoutError(false)
    setDataLoadError(null)
    await fetchAllData()
    setRefreshing(false)
  }

  // Tab navigation from overview
  const handleNavigate = (section: string) => {
    setActiveTab(section as TabType)
  }

  // Update indicators when symbol changes
  const handleSymbolChange = async (symbol: string) => {
    setSelectedSymbol(symbol)
    setIndicatorsError(null)

    try {
      // Check if we already have OHLCV for this symbol
      let ohlcv = ohlcvData[symbol]
      if (!ohlcv) {
        // Fetch real OHLCV data
        ohlcv = await fetchRealOHLCV(symbol)
        if (ohlcv) {
          setOhlcvData(prev => ({ ...prev, [symbol]: ohlcv }))
        }
      }

      if (ohlcv) {
        const indicatorsResult = await aiService.getTechnicalIndicators(symbol, ohlcv)
        setIndicatorsData(indicatorsResult)
      } else {
        setIndicatorsError('Falha ao carregar dados OHLCV')
      }
    } catch (err) {
      console.error('Indicators fetch error:', err)
      setIndicatorsError('Failed to calculate indicators')
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-blue-950/20 text-gray-900 dark:text-white transition-colors'>
      {/* Animated Background Elements */}
      <div className='fixed inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-20 left-10 w-72 h-72 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse' />
        <div className='absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000' />
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/3 dark:bg-indigo-500/5 rounded-full blur-3xl' />
      </div>

      {/* Header - Premium Design */}
      <div className='sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-4'>
              {onBack && (
                <button
                  onClick={onBack}
                  className='p-2 hover:bg-gray-200/80 dark:hover:bg-gray-800/80 rounded-xl transition-colors'
                  aria-label='Go back'
                  title='Go back'
                >
                  <ChevronLeft className='w-5 h-5' />
                </button>
              )}
              <div className='relative'>
                <div className='absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-50 animate-pulse' />
                <div className='relative p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg'>
                  <Brain className='w-7 h-7 text-white' />
                </div>
                <div className='absolute -top-1 -right-1 p-1 bg-yellow-400 rounded-full shadow-lg'>
                  <Sparkles className='w-3 h-3 text-yellow-900' />
                </div>
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <h1 className='text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent'>
                    AI Intelligence
                  </h1>
                  <span className='px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full uppercase tracking-wide'>
                    Pro
                  </span>
                </div>
                <p className='text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1'>
                  <Cpu className='w-3 h-3' />
                  Análise Avançada de Portfolio
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className='flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-sm hover:shadow disabled:opacity-50'
            >
              {refreshing ? (
                <Loader2 className='w-4 h-4 animate-spin text-blue-500' />
              ) : (
                <RefreshCw className='w-4 h-4 text-gray-600 dark:text-gray-400' />
              )}
              <span className='text-sm font-medium hidden sm:inline'>Atualizar</span>
            </button>
          </div>

          {/* Premium Tabs */}
          <div className='flex gap-2 overflow-x-auto pb-2 scrollbar-hide'>
            <TabButton
              active={activeTab === 'overview'}
              icon={Eye}
              label='Visão Geral'
              onClick={() => setActiveTab('overview')}
            />
            <TabButton
              active={activeTab === 'ath'}
              icon={Target}
              label='ATH Analysis'
              onClick={() => setActiveTab('ath')}
            />
            <TabButton
              active={activeTab === 'correlation'}
              icon={GitBranch}
              label='Correlação'
              onClick={() => setActiveTab('correlation')}
            />
            <TabButton
              active={activeTab === 'swap'}
              icon={ArrowRightLeft}
              label='Sugestões'
              onClick={() => setActiveTab('swap')}
            />
            <TabButton
              active={activeTab === 'indicators'}
              icon={Activity}
              label='Indicadores'
              onClick={() => setActiveTab('indicators')}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {/* Loading State - Premium */}
        {loading && (
          <div className='flex flex-col items-center justify-center py-20 space-y-6'>
            <div className='relative'>
              <div className='absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-30 animate-pulse' />
              <div className='relative p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-full border border-blue-200 dark:border-blue-800'>
                <Brain className='w-16 h-16 text-blue-500 animate-pulse' />
              </div>
              <div className='absolute -bottom-2 left-1/2 -translate-x-1/2'>
                <Loader2 className='w-8 h-8 text-purple-500 animate-spin' />
              </div>
            </div>
            <div className='text-center space-y-2'>
              <h3 className='text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                AI Processando...
              </h3>
              <p className='text-sm text-gray-500 dark:text-gray-400 max-w-xs'>
                Analisando seu portfolio com inteligência artificial avançada
              </p>
              <div className='flex items-center justify-center gap-2 pt-2'>
                <div className='w-2 h-2 bg-blue-500 rounded-full animate-bounce' />
                <div className='w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:150ms]' />
                <div className='w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:300ms]' />
              </div>
            </div>
          </div>
        )}

        {/* Error State - Premium with Timeout-specific UI */}
        {!loading && dataLoadError && (
          <div className='flex flex-col items-center justify-center py-16 space-y-6'>
            <div className='relative'>
              <div
                className={`absolute inset-0 ${isTimeoutError ? 'bg-orange-500/20' : 'bg-yellow-500/20'} rounded-full blur-xl animate-pulse`}
              />
              <div
                className={`relative p-6 rounded-full border ${
                  isTimeoutError
                    ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-200 dark:border-orange-800'
                    : 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                {isTimeoutError ? (
                  <Clock className='w-14 h-14 text-orange-500' />
                ) : (
                  <AlertCircle className='w-14 h-14 text-yellow-500' />
                )}
              </div>
            </div>
            <div className='text-center max-w-md space-y-3'>
              <h3 className='text-xl font-bold text-gray-900 dark:text-white'>
                {isTimeoutError ? 'Servidor Ocupado' : 'Atenção'}
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-400'>{dataLoadError}</p>

              {isTimeoutError && (
                <div className='flex items-center justify-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/50'>
                  <WifiOff className='w-4 h-4 text-orange-500' />
                  <p className='text-xs text-orange-600 dark:text-orange-400'>
                    Dica: Tente novamente em horários de menor movimento
                  </p>
                </div>
              )}

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className='mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 flex items-center gap-2 mx-auto'
              >
                {refreshing ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Carregando...
                  </>
                ) : (
                  <>
                    <RefreshCw className='w-4 h-4' />
                    Tentar Novamente
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Portfolio Info Banner - Premium */}
        {!loading && !dataLoadError && portfolio.length > 0 && (
          <div className='mb-6 p-5 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-indigo-500/20 rounded-2xl border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm'>
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
              <div className='flex items-center gap-4'>
                <div className='flex -space-x-3'>
                  {portfolio.slice(0, 4).map((asset, idx) => (
                    <div
                      key={asset.symbol}
                      className={`w-10 h-10 rounded-full bg-white dark:bg-gray-800 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-md ${idx === 0 ? 'z-40' : idx === 1 ? 'z-30' : idx === 2 ? 'z-20' : 'z-10'}`}
                    >
                      <CryptoIcon symbol={asset.symbol} size={24} />
                    </div>
                  ))}
                  {portfolio.length > 4 && (
                    <div className='w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-white shadow-md'>
                      +{portfolio.length - 4}
                    </div>
                  )}
                </div>
                <div>
                  <p className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                    <Zap className='w-4 h-4 text-yellow-500' />
                    Analisando {portfolio.length} {portfolio.length === 1 ? 'ativo' : 'ativos'}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1'>
                    <Shield className='w-3 h-3' />
                    Portfolio Real • Dados em tempo real
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <div className='text-right'>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>Valor Total</p>
                  <p className='text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent'>
                    {formatCurrency(portfolio.reduce((sum, a) => sum + a.value_usd, 0))}
                  </p>
                </div>
                <div className='p-2 bg-green-100 dark:bg-green-900/30 rounded-xl'>
                  <TrendingUp className='w-5 h-5 text-green-600 dark:text-green-400' />
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !dataLoadError && activeTab === 'overview' && (
          <div className='space-y-6'>
            <AIInsightsCard
              athData={athData}
              correlationData={correlationData}
              swapData={swapData}
              loading={loading}
              onNavigate={handleNavigate}
            />

            {/* Quick Preview Cards - Premium Grid */}
            {!loading && (
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {/* ATH Preview - Premium */}
                {athData && athData.length > 0 && (
                  <div className='group relative overflow-hidden p-5 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300'>
                    <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -translate-y-16 translate-x-16' />
                    <div className='flex items-center justify-between mb-4'>
                      <div className='flex items-center gap-3'>
                        <div className='p-2.5 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl'>
                          <Target className='w-5 h-5 text-blue-500' />
                        </div>
                        <div>
                          <span className='text-sm font-semibold text-gray-900 dark:text-white'>
                            Top ATH
                          </span>
                          <p className='text-[10px] text-gray-500 dark:text-gray-400'>
                            Maior potencial
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('ath')}
                        className='text-xs text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all'
                      >
                        Ver todos
                        <ChevronLeft className='w-3 h-3 rotate-180' />
                      </button>
                    </div>
                    {(() => {
                      const sorted = [...athData].sort(
                        (a, b) => b.potential_upside_percent - a.potential_upside_percent
                      )
                      const best = sorted[0]
                      if (!best) return null
                      return (
                        <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl'>
                          <div className='flex items-center gap-3'>
                            <div className='p-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm'>
                              <CryptoIcon symbol={best.symbol} size={28} />
                            </div>
                            <div>
                              <span className='text-lg font-bold text-gray-900 dark:text-white'>
                                {best.symbol}
                              </span>
                              <p className='text-[10px] text-gray-500'>vs ATH</p>
                            </div>
                          </div>
                          <div className='text-right'>
                            <span className='text-lg font-bold text-green-500'>
                              +{best.potential_upside_percent.toFixed(0)}%
                            </span>
                            <p className='text-[10px] text-gray-500'>upside</p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Swap Preview - Premium */}
                {swapData && swapData.suggestions.length > 0 && (
                  <div className='group relative overflow-hidden p-5 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300'>
                    <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -translate-y-16 translate-x-16' />
                    <div className='flex items-center justify-between mb-4'>
                      <div className='flex items-center gap-3'>
                        <div className='p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl'>
                          <Lightbulb className='w-5 h-5 text-purple-500' />
                        </div>
                        <div>
                          <span className='text-sm font-semibold text-gray-900 dark:text-white'>
                            Sugestão AI
                          </span>
                          <p className='text-[10px] text-gray-500 dark:text-gray-400'>
                            Rebalanceamento
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('swap')}
                        className='text-xs text-purple-500 hover:text-purple-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all'
                      >
                        Ver todos
                        <ChevronLeft className='w-3 h-3 rotate-180' />
                      </button>
                    </div>
                    {(() => {
                      const top = swapData.suggestions[0]
                      if (!top) return null
                      return (
                        <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl'>
                          <div className='flex items-center gap-2'>
                            <div className='p-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm'>
                              <CryptoIcon symbol={top.from_symbol} size={24} />
                            </div>
                            <ArrowRightLeft className='w-4 h-4 text-gray-400' />
                            <div className='p-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm'>
                              <CryptoIcon symbol={top.to_symbol} size={24} />
                            </div>
                          </div>
                          <div className='text-right'>
                            <span className='text-lg font-bold text-yellow-500'>
                              {formatCurrency(top.suggested_amount_usd)}
                            </span>
                            <p className='text-[10px] text-gray-500'>sugerido</p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Quick Stats Card */}
                <div className='group relative overflow-hidden p-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300'>
                  <div className='absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16' />
                  <div className='flex items-center gap-3 mb-4'>
                    <div className='p-2.5 bg-white/20 rounded-xl backdrop-blur-sm'>
                      <Rocket className='w-5 h-5 text-white' />
                    </div>
                    <div>
                      <span className='text-sm font-semibold text-white'>Status AI</span>
                      <p className='text-[10px] text-white/70'>Análise completa</p>
                    </div>
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='p-3 bg-white/10 rounded-xl backdrop-blur-sm'>
                      <BarChart3 className='w-4 h-4 text-white/80 mb-1' />
                      <p className='text-lg font-bold text-white'>{portfolio.length}</p>
                      <p className='text-[10px] text-white/70'>Ativos</p>
                    </div>
                    <div className='p-3 bg-white/10 rounded-xl backdrop-blur-sm'>
                      <Activity className='w-4 h-4 text-white/80 mb-1' />
                      <p className='text-lg font-bold text-white'>{athData?.length || 0}</p>
                      <p className='text-[10px] text-white/70'>Análises</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !dataLoadError && activeTab === 'ath' && (
          <ATHAnalysis
            data={athData}
            loading={loading}
            error={athError}
            formatCurrency={formatCurrency}
          />
        )}

        {!loading && !dataLoadError && activeTab === 'correlation' && (
          <CorrelationMatrix data={correlationData} loading={loading} error={correlationError} />
        )}

        {!loading && !dataLoadError && activeTab === 'swap' && (
          <SwapSuggestions
            data={swapData}
            loading={loading}
            error={swapError}
            formatCurrency={formatCurrency}
          />
        )}

        {!loading && !dataLoadError && activeTab === 'indicators' && (
          <div className='space-y-4'>
            {/* Symbol Selector - Premium */}
            <div className='p-4 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800'>
              <div className='flex items-center gap-2 mb-3'>
                <Activity className='w-4 h-4 text-blue-500' />
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Selecione um ativo para análise técnica
                </span>
              </div>
              <div className='flex gap-2 flex-wrap'>
                {portfolio.map(asset => (
                  <button
                    key={asset.symbol}
                    onClick={() => handleSymbolChange(asset.symbol)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selectedSymbol === asset.symbol
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <CryptoIcon symbol={asset.symbol} size={20} />
                    {asset.symbol}
                    {selectedSymbol === asset.symbol && <Sparkles className='w-3 h-3' />}
                  </button>
                ))}
              </div>
            </div>

            <TechnicalIndicators
              data={indicatorsData}
              loading={loading}
              error={indicatorsError}
              formatCurrency={formatCurrency}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default AIIntelligencePage
