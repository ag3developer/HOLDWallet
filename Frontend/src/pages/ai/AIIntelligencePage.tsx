/**
 * AI Intelligence Page
 *
 * Complete AI Portfolio Intelligence dashboard with
 * ATH analysis, correlation matrix, swap suggestions,
 * and technical indicators.
 */

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
} from 'lucide-react'
import {
  AIInsightsCard,
  ATHAnalysis,
  CorrelationMatrix,
  SwapSuggestions,
  TechnicalIndicators,
} from '@/components/ai'
import {
  aiService,
  PortfolioAsset,
  ATHAnalysis as ATHAnalysisType,
  CorrelationResult,
  SwapSuggestionsResult,
  TechnicalIndicators as TechnicalIndicatorsType,
} from '@/services/aiService'

type TabType = 'overview' | 'ath' | 'correlation' | 'swap' | 'indicators'

interface AIIntelligencePageProps {
  portfolio?: PortfolioAsset[]
  priceHistory?: Record<string, number[]>
  ohlcvData?: Record<
    string,
    { open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }
  >
  onBack?: () => void
}

// Mock portfolio for demo
const MOCK_PORTFOLIO: PortfolioAsset[] = [
  { symbol: 'BTC', amount: 0.5, current_price: 97000, value_usd: 48500, cost_basis: 30000 },
  { symbol: 'ETH', amount: 5, current_price: 3400, value_usd: 17000, cost_basis: 2000 },
  { symbol: 'SOL', amount: 100, current_price: 150, value_usd: 15000, cost_basis: 20 },
  { symbol: 'MATIC', amount: 5000, current_price: 0.8, value_usd: 4000, cost_basis: 0.5 },
]

// Mock price history for correlation
const MOCK_PRICE_HISTORY: Record<string, number[]> = {
  BTC: Array.from({ length: 30 }, (_, i) => 90000 + Math.random() * 10000 + i * 200),
  ETH: Array.from({ length: 30 }, (_, i) => 3000 + Math.random() * 500 + i * 10),
  SOL: Array.from({ length: 30 }, (_, i) => 130 + Math.random() * 30 + i * 0.5),
  MATIC: Array.from({ length: 30 }, (_, i) => 0.6 + Math.random() * 0.3 + i * 0.005),
}

// Mock OHLCV for indicators
const MOCK_OHLCV = {
  open: Array.from({ length: 100 }, (_, i) => 90000 + Math.sin(i * 0.1) * 5000),
  high: Array.from({ length: 100 }, (_, i) => 92000 + Math.sin(i * 0.1) * 5000),
  low: Array.from({ length: 100 }, (_, i) => 88000 + Math.sin(i * 0.1) * 5000),
  close: Array.from({ length: 100 }, (_, i) => 91000 + Math.sin(i * 0.1) * 5000),
  volume: Array.from({ length: 100 }, () => Math.random() * 1e9),
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

const AIIntelligencePage: React.FC<AIIntelligencePageProps> = ({
  portfolio = MOCK_PORTFOLIO,
  priceHistory = MOCK_PRICE_HISTORY,
  ohlcvData,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Data states
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

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true)
    setAthError(null)
    setCorrelationError(null)
    setSwapError(null)
    setIndicatorsError(null)

    try {
      // Fetch ATH data for all portfolio assets
      const athPromises = portfolio.map(asset =>
        aiService.getATHAnalysis(asset.symbol, asset.current_price).catch(err => {
          console.error(`ATH error for ${asset.symbol}:`, err)
          return null
        })
      )
      const athResults = await Promise.all(athPromises)
      const validAthResults = athResults.filter((r): r is ATHAnalysisType => r !== null)
      setAthData(validAthResults.length > 0 ? validAthResults : null)
      if (validAthResults.length === 0) {
        setAthError('Could not fetch ATH data')
      }
    } catch (err) {
      console.error('ATH fetch error:', err)
      setAthError('Failed to fetch ATH analysis')
    }

    try {
      // Fetch correlation data
      const correlationResult = await aiService.getCorrelation(priceHistory, 30)
      setCorrelationData(correlationResult)
    } catch (err) {
      console.error('Correlation fetch error:', err)
      setCorrelationError('Failed to calculate correlations')
    }

    try {
      // Fetch swap suggestions
      const swapResult = await aiService.getSwapSuggestions(portfolio)
      setSwapData(swapResult)
    } catch (err) {
      console.error('Swap fetch error:', err)
      setSwapError('Failed to get swap suggestions')
    }

    try {
      // Fetch indicators for selected symbol
      const indicatorOhlcv = ohlcvData?.[selectedSymbol] || MOCK_OHLCV
      const indicatorsResult = await aiService.getTechnicalIndicators(
        selectedSymbol,
        indicatorOhlcv
      )
      setIndicatorsData(indicatorsResult)
    } catch (err) {
      console.error('Indicators fetch error:', err)
      setIndicatorsError('Failed to calculate indicators')
    }

    setLoading(false)
  }, [portfolio, priceHistory, ohlcvData, selectedSymbol])

  // Initial fetch
  useEffect(() => {
    fetchAllData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      const indicatorOhlcv = ohlcvData?.[symbol] || MOCK_OHLCV
      const indicatorsResult = await aiService.getTechnicalIndicators(symbol, indicatorOhlcv)
      setIndicatorsData(indicatorsResult)
    } catch (err) {
      console.error('Indicators fetch error:', err)
      setIndicatorsError('Failed to calculate indicators')
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors'>
      {/* Header */}
      <div className='sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800'>
        <div className='max-w-4xl mx-auto px-4 py-4'>
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
      <div className='max-w-4xl mx-auto px-4 py-6'>
        {activeTab === 'overview' && (
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
              <div className='grid gap-4 md:grid-cols-2'>
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
                          <span className='text-lg font-bold'>{best.symbol}</span>
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
                          <span className='text-sm'>
                            {top.from_symbol} → {top.to_symbol}
                          </span>
                          <span className='text-yellow-400 text-sm'>
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

        {activeTab === 'ath' && <ATHAnalysis data={athData} loading={loading} error={athError} />}

        {activeTab === 'correlation' && (
          <CorrelationMatrix data={correlationData} loading={loading} error={correlationError} />
        )}

        {activeTab === 'swap' && (
          <SwapSuggestions data={swapData} loading={loading} error={swapError} />
        )}

        {activeTab === 'indicators' && (
          <div className='space-y-4'>
            {/* Symbol Selector */}
            <div className='flex items-center gap-2 mb-4'>
              <span className='text-sm text-gray-500 dark:text-gray-400'>Select Asset:</span>
              <div className='flex gap-2'>
                {portfolio.map(asset => (
                  <button
                    key={asset.symbol}
                    onClick={() => handleSymbolChange(asset.symbol)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedSymbol === asset.symbol
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
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
