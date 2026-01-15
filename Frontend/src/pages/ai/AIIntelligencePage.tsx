import React, { useState, useEffect, useCallback } from 'react'
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
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
      active
        ? 'bg-blue-600 text-white'
        : 'bg-gray-200 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-300'
    }`}
  >
    <Icon className='w-4 h-4' />
    <span className='text-sm font-medium hidden sm:inline'>{label}</span>
  </button>
)

const AIIntelligencePage: React.FC<AIIntelligencePageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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

  // ===================
  // Fetch Real Portfolio from User's Wallet
  // ===================
  const fetchRealPortfolio = useCallback(async (): Promise<PortfolioAsset[]> => {
    try {
      // Get user's wallets
      const walletsResp = await apiClient.get('/wallets/')
      const wallets = walletsResp.data
      if (!wallets?.length) return []

      const walletId = wallets[0].id

      // Get balances with tokens
      const balanceResp = await apiClient.get(`/wallets/${walletId}/balances?include_tokens=true`)
      const balances = balanceResp.data.balances || {}

      // Get current prices
      const pricesResp = await apiClient.get('/prices/batch', {
        params: { symbols: 'BTC,ETH,SOL,MATIC,BNB,ADA,DOT,LINK,AVAX,LTC,DOGE,XRP,TRX' },
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
      setDataLoadError('Erro ao carregar dados. Tente novamente.')
    }

    setLoading(false)
  }, [fetchRealPortfolio, fetchRealPriceHistory, fetchRealOHLCV])

  // Initial fetch
  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true)
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
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors'>
      {/* Header */}
      <div className='sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-3'>
              {onBack && (
                <button
                  onClick={onBack}
                  className='p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors'
                  aria-label='Go back'
                  title='Go back'
                >
                  <ChevronLeft className='w-5 h-5' />
                </button>
              )}
              <div className='relative'>
                <Brain className='w-8 h-8 text-blue-500' />
                <Sparkles className='w-4 h-4 text-yellow-400 absolute -top-1 -right-1' />
              </div>
              <div>
                <h1 className='text-xl font-bold'>AI Intelligence</h1>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Portfolio Analysis</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className='flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50'
            >
              {refreshing ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <RefreshCw className='w-4 h-4' />
              )}
              <span className='text-sm hidden sm:inline'>Refresh</span>
            </button>
          </div>

          {/* Tabs */}
          <div className='flex gap-2 overflow-x-auto pb-2 scrollbar-hide'>
            <TabButton
              active={activeTab === 'overview'}
              icon={Brain}
              label='Overview'
              onClick={() => setActiveTab('overview')}
            />
            <TabButton
              active={activeTab === 'ath'}
              icon={Target}
              label='ATH'
              onClick={() => setActiveTab('ath')}
            />
            <TabButton
              active={activeTab === 'correlation'}
              icon={GitBranch}
              label='Correlation'
              onClick={() => setActiveTab('correlation')}
            />
            <TabButton
              active={activeTab === 'swap'}
              icon={ArrowRightLeft}
              label='Swap'
              onClick={() => setActiveTab('swap')}
            />
            <TabButton
              active={activeTab === 'indicators'}
              icon={Activity}
              label='Indicators'
              onClick={() => setActiveTab('indicators')}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {/* Loading State */}
        {loading && (
          <div className='flex flex-col items-center justify-center py-16 space-y-4'>
            <Loader2 className='w-12 h-12 text-blue-500 animate-spin' />
            <div className='text-center'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                Carregando AI Intelligence
              </h3>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Buscando dados reais do seu portfolio e mercado...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && dataLoadError && (
          <div className='flex flex-col items-center justify-center py-16 space-y-4'>
            <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-full'>
              <AlertCircle className='w-12 h-12 text-yellow-500' />
            </div>
            <div className='text-center max-w-md'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>Aviso</h3>
              <p className='text-sm text-gray-600 dark:text-gray-400'>{dataLoadError}</p>
              <button
                onClick={handleRefresh}
                className='mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        )}

        {/* Portfolio Info Banner */}
        {!loading && !dataLoadError && portfolio.length > 0 && (
          <div className='mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800'>
            <div className='flex items-center gap-3'>
              <div className='flex -space-x-2'>
                {portfolio.slice(0, 4).map(asset => (
                  <div
                    key={asset.symbol}
                    className='w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-white dark:border-gray-800 flex items-center justify-center'
                  >
                    <CryptoIcon symbol={asset.symbol} size={20} />
                  </div>
                ))}
                {portfolio.length > 4 && (
                  <div className='w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium'>
                    +{portfolio.length - 4}
                  </div>
                )}
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900 dark:text-white'>
                  Analisando {portfolio.length} {portfolio.length === 1 ? 'ativo' : 'ativos'} do seu
                  portfolio
                </p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  Total: $
                  {portfolio
                    .reduce((sum, a) => sum + a.value_usd, 0)
                    .toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </p>
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

            {/* Quick Preview Cards */}
            {!loading && (
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                {/* ATH Preview */}
                {athData && athData.length > 0 && (
                  <div className='p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm'>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center gap-2'>
                        <Target className='w-4 h-4 text-blue-400' />
                        <span className='text-sm font-medium'>Top ATH Opportunity</span>
                      </div>
                      <button
                        onClick={() => setActiveTab('ath')}
                        className='text-xs text-blue-500 hover:text-blue-400'
                      >
                        View all
                      </button>
                    </div>
                    {(() => {
                      const sorted = [...athData].sort(
                        (a, b) => b.potential_upside_percent - a.potential_upside_percent
                      )
                      const best = sorted[0]
                      if (!best) return null
                      return (
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <CryptoIcon symbol={best.symbol} size={28} />
                            <span className='text-lg font-bold'>{best.symbol}</span>
                          </div>
                          <span className='text-green-400 font-bold'>
                            +{best.potential_upside_percent.toFixed(0)}% upside
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Swap Preview */}
                {swapData && swapData.suggestions.length > 0 && (
                  <div className='p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm'>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center gap-2'>
                        <ArrowRightLeft className='w-4 h-4 text-purple-400' />
                        <span className='text-sm font-medium'>Top Suggestion</span>
                      </div>
                      <button
                        onClick={() => setActiveTab('swap')}
                        className='text-xs text-blue-500 hover:text-blue-400'
                      >
                        View all
                      </button>
                    </div>
                    {(() => {
                      const top = swapData.suggestions[0]
                      if (!top) return null
                      return (
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-1'>
                            <CryptoIcon symbol={top.from_symbol} size={20} />
                            <span className='text-sm'>→</span>
                            <CryptoIcon symbol={top.to_symbol} size={20} />
                          </div>
                          <span className='text-yellow-400 text-sm font-medium'>
                            ${top.suggested_amount_usd.toFixed(0)}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!loading && !dataLoadError && activeTab === 'ath' && (
          <ATHAnalysis data={athData} loading={loading} error={athError} />
        )}

        {!loading && !dataLoadError && activeTab === 'correlation' && (
          <CorrelationMatrix data={correlationData} loading={loading} error={correlationError} />
        )}

        {!loading && !dataLoadError && activeTab === 'swap' && (
          <SwapSuggestions data={swapData} loading={loading} error={swapError} />
        )}

        {!loading && !dataLoadError && activeTab === 'indicators' && (
          <div className='space-y-4'>
            {/* Symbol Selector */}
            <div className='flex items-center gap-2 mb-4 flex-wrap'>
              <span className='text-sm text-gray-500 dark:text-gray-400'>Select Asset:</span>
              <div className='flex gap-2 flex-wrap'>
                {portfolio.map(asset => (
                  <button
                    key={asset.symbol}
                    onClick={() => handleSymbolChange(asset.symbol)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedSymbol === asset.symbol
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <CryptoIcon symbol={asset.symbol} size={18} />
                    {asset.symbol}
                  </button>
                ))}
              </div>
            </div>

            <TechnicalIndicators data={indicatorsData} loading={loading} error={indicatorsError} />
          </div>
        )}
      </div>
    </div>
  )
}

export default AIIntelligencePage
