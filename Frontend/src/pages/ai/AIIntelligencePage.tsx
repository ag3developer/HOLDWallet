/**
 * AI Intelligence Page - Revolutionized
 *
 * Design padrão InstantTrade com:
 * - Layout responsivo PWA (mobile first, Safari iOS)
 * - Logos das criptomoedas com CryptoIcon
 * - Cards modernos com gradientes
 * - Carrossel de portfolio
 * - Integração com dados reais do portfolio do usuário
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Brain,
  Target,
  GitBranch,
  ArrowRightLeft,
  Activity,
  RefreshCw,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Flame,
  Eye,
  AlertTriangle,
  CheckCircle,
  Wallet,
} from 'lucide-react'
import { CryptoIcon } from '@/components/CryptoIcon'
import {
  aiService,
  PortfolioAsset,
  ATHAnalysis as ATHAnalysisType,
  CorrelationResult,
  SwapSuggestionsResult,
  TechnicalIndicators as TechnicalIndicatorsType,
} from '@/services/aiService'
import { portfolioService, PortfolioResponse } from '@/services/portfolioService'
import { WalletService } from '@/services/wallet-service'

type TabType = 'overview' | 'ath' | 'correlation' | 'swap' | 'indicators'

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '$0.00'
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '0.00%'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

const safeToFixed = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) return '0'
  return value.toFixed(decimals)
}

// Portfolio Carousel Component (like InstantTrade)
const PortfolioCarousel: React.FC<{
  portfolio: PortfolioAsset[]
  selectedSymbol: string
  onSelect: (symbol: string) => void
}> = ({ portfolio, selectedSymbol, onSelect }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  useEffect(() => {
    checkScroll()
    const ref = scrollRef.current
    if (ref) {
      ref.addEventListener('scroll', checkScroll)
      return () => ref.removeEventListener('scroll', checkScroll)
    }
    return undefined
  }, [])

  const totalValue = portfolio.reduce((sum, a) => sum + a.value_usd, 0)

  return (
    <div className='relative'>
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          title='Scroll left'
          aria-label='Scroll left'
          className='absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform'
        >
          <ChevronLeft className='w-4 h-4 text-gray-600 dark:text-gray-300' />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          title='Scroll right'
          aria-label='Scroll right'
          className='absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform'
        >
          <ChevronRight className='w-4 h-4 text-gray-600 dark:text-gray-300' />
        </button>
      )}

      <div
        ref={scrollRef}
        className='flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-1 -mx-1 scroll-smooth'
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {portfolio.map(asset => {
          const allocation = (asset.value_usd / totalValue) * 100
          const costBasis = asset.cost_basis || asset.current_price
          const pnl = costBasis > 0 ? ((asset.current_price - costBasis) / costBasis) * 100 : 0
          const isSelected = selectedSymbol === asset.symbol

          return (
            <button
              key={asset.symbol}
              onClick={() => onSelect(asset.symbol)}
              className={`flex-shrink-0 p-4 rounded-2xl border-2 transition-all duration-200 min-w-[160px] ${
                isSelected
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-transparent text-white shadow-lg scale-105'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
              }`}
            >
              <div className='flex items-center gap-3 mb-3'>
                <div
                  className={`p-2 rounded-xl ${isSelected ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}
                >
                  <CryptoIcon symbol={asset.symbol} size={24} />
                </div>
                <div className='text-left'>
                  <p
                    className={`font-bold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}
                  >
                    {asset.symbol}
                  </p>
                  <p
                    className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    {safeToFixed(allocation, 1)}%
                  </p>
                </div>
              </div>
              <div className='text-left'>
                <p
                  className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}
                >
                  {formatCurrency(asset.value_usd)}
                </p>
                <p
                  className={`text-xs font-medium flex items-center gap-1 ${
                    pnl >= 0
                      ? isSelected
                        ? 'text-green-200'
                        : 'text-green-500'
                      : isSelected
                        ? 'text-red-200'
                        : 'text-red-500'
                  }`}
                >
                  {pnl >= 0 ? (
                    <TrendingUp className='w-3 h-3' />
                  ) : (
                    <TrendingDown className='w-3 h-3' />
                  )}
                  {formatPercent(pnl)}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Tab Button Component
const TabButton: React.FC<{
  active: boolean
  icon: React.ElementType
  label: string
  badge?: string | undefined
  onClick: () => void
}> = ({ active, icon: Icon, label, badge, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
      active
        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
    }`}
  >
    <Icon className='w-4 h-4' />
    <span className='text-sm hidden sm:inline'>{label}</span>
    {badge && (
      <span
        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
          active
            ? 'bg-white/20 text-white'
            : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
        }`}
      >
        {badge}
      </span>
    )}
  </button>
)

// Quick Insight Card
const InsightCard: React.FC<{
  icon: React.ElementType
  title: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}> = ({ icon: Icon, title, value, subtitle, trend, color }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-emerald-600',
    purple: 'from-purple-500 to-violet-600',
    orange: 'from-orange-500 to-amber-600',
    red: 'from-red-500 to-rose-600',
  }

  // Format long status values to be more readable
  const formatValue = (val: string) => {
    const formatted = val.replace(/_/g, ' ')
    if (formatted.length > 12) {
      return formatted
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }
    return formatted
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden'>
      <div className='flex items-start justify-between mb-3'>
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg flex-shrink-0`}
        >
          <Icon className='w-5 h-5 text-white' />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
              trend === 'up'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : trend === 'down'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {trend === 'up' ? (
              <TrendingUp className='w-3 h-3' />
            ) : trend === 'down' ? (
              <TrendingDown className='w-3 h-3' />
            ) : null}
            {trend}
          </div>
        )}
      </div>
      <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
        {title}
      </p>
      <p
        className='text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate'
        title={value}
      >
        {formatValue(value)}
      </p>
      {subtitle && <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>{subtitle}</p>}
    </div>
  )
}

// ATH Card Component
const ATHCard: React.FC<{ asset: ATHAnalysisType }> = ({ asset }) => {
  const zoneColors: Record<string, { bg: string; text: string; border: string }> = {
    ATH_ZONE: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-500',
    },
    STRONG: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500',
    },
    RECOVERING: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-500',
    },
    WEAK: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-500',
    },
    CAPITULATION: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-500',
    },
  }

  const assetZone = asset.zone || 'RECOVERING'
  const zone = zoneColors[assetZone] ??
    zoneColors.RECOVERING ?? {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-600 dark:text-gray-400',
      border: 'border-gray-500',
    }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border-l-4 ${zone.border} shadow-sm hover:shadow-md transition-all`}
    >
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-gray-100 dark:bg-gray-700 rounded-xl'>
            <CryptoIcon symbol={asset.symbol} size={28} />
          </div>
          <div>
            <p className='font-bold text-gray-900 dark:text-white'>{asset.symbol}</p>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${zone.bg} ${zone.text}`}
            >
              {assetZone.replace('_', ' ')}
            </span>
          </div>
        </div>
        {asset.at_ath && (
          <div className='flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 rounded-full'>
            <Sparkles className='w-3 h-3 text-green-500' />
            <span className='text-xs font-bold text-green-600 dark:text-green-400'>ATH!</span>
          </div>
        )}
      </div>

      <div className='grid grid-cols-2 gap-3 mb-4'>
        <div className='bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3'>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Current</p>
          <p className='text-lg font-bold text-gray-900 dark:text-white'>
            {formatCurrency(asset.current_price)}
          </p>
        </div>
        <div className='bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3'>
          <p className='text-xs text-gray-500 dark:text-gray-400'>ATH</p>
          <p className='text-lg font-bold text-gray-500 dark:text-gray-300'>
            {formatCurrency(asset.ath_price)}
          </p>
        </div>
      </div>

      <div className='mb-3'>
        <div className='flex justify-between text-xs mb-1'>
          <span className='text-gray-500 dark:text-gray-400'>Recovery</span>
          <span className={`font-bold ${zone.text}`}>
            {safeToFixed(asset.recovery_percent, 1)}%
          </span>
        </div>
        <div className='h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
          <div
            className={`h-full rounded-full bg-gradient-to-r ${
              assetZone === 'ATH_ZONE'
                ? 'from-green-400 to-green-500'
                : assetZone === 'STRONG'
                  ? 'from-emerald-400 to-emerald-500'
                  : assetZone === 'RECOVERING'
                    ? 'from-yellow-400 to-yellow-500'
                    : assetZone === 'WEAK'
                      ? 'from-orange-400 to-orange-500'
                      : 'from-red-400 to-red-500'
            } transition-all duration-500`}
            style={{ width: `${Math.min(asset.recovery_percent || 0, 100)}%` }}
          />
        </div>
      </div>

      <div className='grid grid-cols-3 gap-2'>
        <div className='text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
          <p className='text-[10px] text-gray-500 dark:text-gray-400'>Distance</p>
          <p className='text-sm font-bold text-red-500'>
            -{safeToFixed(asset.distance_from_ath_percent, 1)}%
          </p>
        </div>
        <div className='text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
          <p className='text-[10px] text-gray-500 dark:text-gray-400'>Upside</p>
          <p className='text-sm font-bold text-blue-500'>
            +{safeToFixed(asset.potential_upside_percent, 1)}%
          </p>
        </div>
        <div className='text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
          <p className='text-[10px] text-gray-500 dark:text-gray-400'>Days</p>
          <p className='text-sm font-bold text-purple-500'>{asset.days_since_ath || 0}d</p>
        </div>
      </div>
    </div>
  )
}

// Main Page Component
export default function AIIntelligencePage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('BTC')
  const [portfolioError, setPortfolioError] = useState<string | null>(null)

  // Real portfolio data from backend
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([])
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioResponse['summary'] | null>(
    null
  )

  // AI analysis data
  const [athData, setAthData] = useState<ATHAnalysisType[] | null>(null)
  const [correlationData, setCorrelationData] = useState<CorrelationResult | null>(null)
  const [swapData, setSwapData] = useState<SwapSuggestionsResult | null>(null)
  const [indicatorsData, setIndicatorsData] = useState<TechnicalIndicatorsType | null>(null)

  const totalValue = portfolio.reduce((sum, a) => sum + a.value_usd, 0)

  // Fetch portfolio from backend
  const fetchPortfolio = useCallback(async () => {
    try {
      console.log('[AIIntelligence] 📊 Fetching user portfolio...')
      const response = await portfolioService.getPortfolio()

      if (response.assets.length > 0) {
        // Convert to PortfolioAsset format for AI service
        const assets: PortfolioAsset[] = response.assets.map(a => ({
          symbol: a.symbol,
          amount: a.amount,
          current_price: a.current_price,
          value_usd: a.value_usd,
          cost_basis: a.cost_basis,
        }))
        setPortfolio(assets)
        setPortfolioSummary(response.summary)
        setPortfolioError(null)

        // Set first asset as selected
        if (assets.length > 0 && !selectedSymbol) {
          const firstAsset = assets[0]
          if (firstAsset) {
            setSelectedSymbol(firstAsset.symbol)
          }
        }

        console.log('[AIIntelligence] ✅ Portfolio loaded:', assets.length, 'assets')
        return assets
      } else {
        // Try to sync from wallet balances
        console.log('[AIIntelligence] 📭 Empty portfolio, trying to sync from wallet...')
        await syncFromWallet()
        return []
      }
    } catch (error) {
      console.error('[AIIntelligence] ❌ Error fetching portfolio:', error)
      setPortfolioError('Erro ao carregar portfolio. Usando dados de demonstração.')
      return []
    }
  }, [selectedSymbol])

  // Sync portfolio from wallet balances
  const syncFromWallet = async () => {
    try {
      const wallets = await WalletService.getWallets()
      if (!wallets || wallets.length === 0) {
        console.log('[AIIntelligence] 📭 No wallets found')
        return
      }

      // Get balances from first wallet
      const firstWallet = wallets[0]
      const balances = await WalletService.getWalletBalances(String(firstWallet.id))

      if (Object.keys(balances).length > 0) {
        console.log('[AIIntelligence] 🔄 Syncing portfolio with wallet balances:', balances)
        await portfolioService.syncWithBalances(balances)

        // Refetch portfolio after sync
        const response = await portfolioService.getPortfolio()
        if (response.assets.length > 0) {
          const assets: PortfolioAsset[] = response.assets.map(a => ({
            symbol: a.symbol,
            amount: a.amount,
            current_price: a.current_price,
            value_usd: a.value_usd,
            cost_basis: a.cost_basis,
          }))
          setPortfolio(assets)
          setPortfolioSummary(response.summary)
          setSelectedSymbol(assets[0]?.symbol || 'BTC')
        }
      }
    } catch (error) {
      console.error('[AIIntelligence] ❌ Error syncing from wallet:', error)
    }
  }

  const fetchAllData = useCallback(async () => {
    try {
      // First, fetch real portfolio
      const portfolioAssets = await fetchPortfolio()

      if (portfolioAssets.length === 0) {
        console.log('[AIIntelligence] ⚠️ No portfolio assets, skipping AI analysis')
        setLoading(false)
        setRefreshing(false)
        return
      }

      // Fetch REAL price history for correlation from backend
      console.log('[AIIntelligence] 📈 Fetching real price history...')
      const { priceHistoryService } = await import('@/services/priceHistoryService')
      const priceHistory = await priceHistoryService.getMultiplePriceHistory(
        portfolioAssets.map(a => a.symbol),
        30,
        'usd'
      )
      console.log('[AIIntelligence] ✅ Got price history for:', Object.keys(priceHistory))

      // ATH Analysis for each asset
      const athPromises = portfolioAssets.map(asset =>
        aiService.getATHAnalysis(asset.symbol, asset.current_price).catch(() => null)
      )
      const athResults = await Promise.all(athPromises)
      setAthData(athResults.filter((r): r is ATHAnalysisType => r !== null))

      // Correlation Matrix (only if we have price history)
      if (Object.keys(priceHistory).length > 1) {
        const corr = await aiService.getCorrelation(priceHistory, 30).catch(() => null)
        setCorrelationData(corr)
      }

      // Swap Suggestions
      const swap = await aiService.getSwapSuggestions(portfolioAssets).catch(() => null)
      setSwapData(swap)

      // Technical Indicators for selected symbol - fetch OHLCV data first
      try {
        const ohlcv = await priceHistoryService.getOHLCV(selectedSymbol, 30)
        if (ohlcv.close.length > 0) {
          const ind = await aiService
            .getTechnicalIndicators(selectedSymbol, ohlcv)
            .catch(() => null)
          setIndicatorsData(ind)
        }
      } catch (error_indicators) {
        console.warn('[AIIntelligence] ⚠️ Could not fetch indicators:', error_indicators)
      }
    } catch (err) {
      console.error('Error fetching AI data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [fetchPortfolio, selectedSymbol])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAllData()
  }

  const healthyAssets =
    athData?.filter(a => a.zone === 'ATH_ZONE' || a.zone === 'STRONG').length || 0
  const highCorrelations = correlationData?.high_correlations.length || 0
  const suggestions = swapData?.summary.total_suggestions || 0
  const portfolioScore = swapData?.summary.portfolio_balance_score || 75

  return (
    <div className='space-y-6 pb-20'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <div className='flex items-center gap-3 mb-1'>
            <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>
              {t('aiIntelligence.title', 'AI Intelligence')}
            </h1>
            <div className='flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full'>
              <Brain className='w-3.5 h-3.5 text-white' />
              <span className='text-xs font-bold text-white'>AI</span>
            </div>
          </div>
          <p className='text-gray-500 dark:text-gray-400 text-sm'>
            {t('aiIntelligence.subtitle', 'Smart portfolio analysis powered by AI')}
          </p>
        </div>

        <div className='flex gap-2 flex-wrap'>
          <div className='flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm'>
            <PieChart className='w-4 h-4 text-blue-500' />
            <div>
              <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                Score
              </p>
              <p className='text-sm font-bold text-gray-900 dark:text-white'>{portfolioScore}%</p>
            </div>
          </div>
          <div className='flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm'>
            <Flame className='w-4 h-4 text-orange-500' />
            <div>
              <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                Assets
              </p>
              <p className='text-sm font-bold text-gray-900 dark:text-white'>{portfolio.length}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className='flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white shadow-sm transition-colors disabled:opacity-50'
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className='text-sm font-medium hidden sm:inline'>Refresh</span>
          </button>
        </div>
      </div>

      {/* Portfolio Carousel */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <Sparkles className='w-5 h-5 text-purple-500' />
            <h2 className='font-bold text-gray-900 dark:text-white'>Your Portfolio</h2>
          </div>
          <div className='text-right'>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Total Value</p>
            <p className='text-lg font-bold text-gray-900 dark:text-white'>
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>

        {portfolio.length > 0 ? (
          <PortfolioCarousel
            portfolio={portfolio}
            selectedSymbol={selectedSymbol}
            onSelect={setSelectedSymbol}
          />
        ) : (
          <div className='flex flex-col items-center justify-center py-8 text-center'>
            <div className='p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4'>
              <Wallet className='w-8 h-8 text-gray-400' />
            </div>
            <p className='text-gray-500 dark:text-gray-400 mb-2'>
              {portfolioError || 'Nenhum ativo encontrado'}
            </p>
            <p className='text-sm text-gray-400 dark:text-gray-500 mb-4'>
              Compre criptomoedas no InstantTrade para começar sua análise AI
            </p>
            <a
              href='/instant-trade'
              className='px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity'
            >
              Ir para InstantTrade
            </a>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        className='flex gap-2 overflow-x-auto scrollbar-hide pb-2'
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <TabButton
          active={activeTab === 'overview'}
          icon={Eye}
          label='Overview'
          onClick={() => setActiveTab('overview')}
        />
        <TabButton
          active={activeTab === 'ath'}
          icon={Target}
          label='ATH'
          badge={athData?.length?.toString()}
          onClick={() => setActiveTab('ath')}
        />
        <TabButton
          active={activeTab === 'correlation'}
          icon={GitBranch}
          label='Correlation'
          badge={highCorrelations > 0 ? `${highCorrelations}!` : undefined}
          onClick={() => setActiveTab('correlation')}
        />
        <TabButton
          active={activeTab === 'swap'}
          icon={ArrowRightLeft}
          label='Swap'
          badge={suggestions > 0 ? suggestions.toString() : undefined}
          onClick={() => setActiveTab('swap')}
        />
        <TabButton
          active={activeTab === 'indicators'}
          icon={Activity}
          label='Indicators'
          onClick={() => setActiveTab('indicators')}
        />
      </div>

      {loading ? (
        <div className='flex flex-col items-center justify-center py-20'>
          <div className='relative mb-4'>
            <Brain className='w-16 h-16 text-purple-500' />
            <Sparkles className='w-6 h-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse' />
          </div>
          <Loader2 className='w-8 h-8 text-blue-500 animate-spin mb-4' />
          <p className='text-gray-500 dark:text-gray-400'>Analyzing your portfolio...</p>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className='space-y-6'>
              <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                <InsightCard
                  icon={Target}
                  title='ATH Recovery'
                  value={`${athData && athData.length > 0 ? safeToFixed(athData.reduce((s, a) => s + (a.recovery_percent || 0), 0) / athData.length, 0) : 0}%`}
                  subtitle={`${healthyAssets}/${portfolio.length} healthy`}
                  trend={healthyAssets > portfolio.length / 2 ? 'up' : 'down'}
                  color='green'
                />
                <InsightCard
                  icon={GitBranch}
                  title='Diversification'
                  value={highCorrelations === 0 ? 'Good' : `${highCorrelations} issues`}
                  subtitle={
                    correlationData ? `${correlationData.symbols.length} pairs` : 'Calculating...'
                  }
                  trend={highCorrelations === 0 ? 'up' : 'down'}
                  color='purple'
                />
                <InsightCard
                  icon={ArrowRightLeft}
                  title='Suggestions'
                  value={suggestions.toString()}
                  subtitle={swapData ? `${swapData.summary.high_priority_count} high priority` : ''}
                  trend={suggestions === 0 ? 'up' : 'neutral'}
                  color='blue'
                />
                <InsightCard
                  icon={Shield}
                  title='Health Status'
                  value={swapData?.summary.health_status || 'ANALYZING'}
                  subtitle={`Score: ${portfolioScore}%`}
                  trend={portfolioScore >= 70 ? 'up' : portfolioScore >= 50 ? 'neutral' : 'down'}
                  color={portfolioScore >= 70 ? 'green' : portfolioScore >= 50 ? 'orange' : 'red'}
                />
              </div>

              <div className='bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-lg'>
                    <Brain className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <h3 className='font-bold text-gray-900 dark:text-white'>AI Insights</h3>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      Powered by machine learning
                    </p>
                  </div>
                </div>

                <div className='space-y-3'>
                  {healthyAssets >= portfolio.length / 2 && (
                    <div className='flex items-start gap-3 p-3 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20 rounded-xl border-l-4 border-green-500'>
                      <CheckCircle className='w-5 h-5 text-green-500 mt-0.5' />
                      <div>
                        <p className='font-medium text-gray-900 dark:text-white'>
                          Portfolio is healthy
                        </p>
                        <p className='text-sm text-gray-600 dark:text-gray-400'>
                          Most assets are recovering well from their ATH
                        </p>
                      </div>
                    </div>
                  )}
                  {highCorrelations > 0 && (
                    <div className='flex items-start gap-3 p-3 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-900/20 rounded-xl border-l-4 border-orange-500'>
                      <AlertTriangle className='w-5 h-5 text-orange-500 mt-0.5' />
                      <div>
                        <p className='font-medium text-gray-900 dark:text-white'>
                          High correlation detected
                        </p>
                        <p className='text-sm text-gray-600 dark:text-gray-400'>
                          Consider diversifying to reduce risk
                        </p>
                      </div>
                    </div>
                  )}
                  {suggestions > 0 && (
                    <div className='flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 rounded-xl border-l-4 border-blue-500'>
                      <Zap className='w-5 h-5 text-blue-500 mt-0.5' />
                      <div>
                        <p className='font-medium text-gray-900 dark:text-white'>
                          {suggestions} rebalancing opportunities
                        </p>
                        <p className='text-sm text-gray-600 dark:text-gray-400'>
                          Check the Swap tab for details
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ATH Tab */}
          {activeTab === 'ath' && (
            <div className='space-y-4'>
              {athData && athData.length > 0 ? (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {athData.map(asset => (
                    <ATHCard key={asset.symbol} asset={asset} />
                  ))}
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400'>
                  <Target className='w-16 h-16 mb-4 opacity-30' />
                  <p>No ATH data available</p>
                </div>
              )}
            </div>
          )}

          {/* Correlation Tab */}
          {activeTab === 'correlation' && (
            <div className='bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm'>
              {correlationData ? (
                <div className='space-y-6'>
                  <div className='flex items-center gap-3'>
                    <GitBranch className='w-5 h-5 text-purple-500' />
                    <h3 className='font-bold text-gray-900 dark:text-white'>Correlation Matrix</h3>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      {correlationData.lookback_days} days • {correlationData.data_points} points
                    </span>
                  </div>

                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead>
                        <tr>
                          <th className='p-2'></th>
                          {correlationData.symbols.map(s => (
                            <th key={s} className='p-2 text-center'>
                              <CryptoIcon symbol={s} size={20} className='mx-auto mb-1' />
                              <span className='text-xs text-gray-600 dark:text-gray-300'>{s}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {correlationData.symbols.map(row => (
                          <tr key={row}>
                            <td className='p-2 text-xs font-medium text-gray-600 dark:text-gray-300'>
                              {row}
                            </td>
                            {correlationData.symbols.map(col => {
                              const val = correlationData.matrix[row]?.[col] ?? 0
                              const isMain = row === col
                              return (
                                <td key={`${row}-${col}`} className='p-1'>
                                  <div
                                    className={`w-14 h-14 flex items-center justify-center rounded-lg text-xs font-bold ${
                                      isMain
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                        : val >= 0.8
                                          ? 'bg-red-500 text-white'
                                          : val >= 0.6
                                            ? 'bg-orange-500 text-white'
                                            : val >= 0.4
                                              ? 'bg-yellow-500 text-white'
                                              : val >= 0.2
                                                ? 'bg-green-400 text-white'
                                                : 'bg-green-500 text-white'
                                    }`}
                                  >
                                    {safeToFixed((val || 0) * 100, 0)}%
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className='flex items-center justify-center gap-4 py-2 flex-wrap'>
                    <div className='flex items-center gap-2'>
                      <div className='w-4 h-4 rounded bg-red-500' />
                      <span className='text-xs text-gray-500 dark:text-gray-400'>High (80%+)</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <div className='w-4 h-4 rounded bg-yellow-500' />
                      <span className='text-xs text-gray-500 dark:text-gray-400'>
                        Medium (40-60%)
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <div className='w-4 h-4 rounded bg-green-500' />
                      <span className='text-xs text-gray-500 dark:text-gray-400'>Low (0-20%)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400'>
                  <GitBranch className='w-16 h-16 mb-4 opacity-30' />
                  <p>No correlation data available</p>
                </div>
              )}
            </div>
          )}

          {/* Swap Suggestions Tab */}
          {activeTab === 'swap' && (
            <div className='space-y-4'>
              {swapData ? (
                <>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                    <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 text-center'>
                      <p className='text-3xl font-bold text-gray-900 dark:text-white'>
                        {swapData.summary.total_suggestions}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Suggestions</p>
                    </div>
                    <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 text-center'>
                      <p className='text-3xl font-bold text-blue-500'>
                        {swapData.summary.portfolio_balance_score}%
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Balance Score</p>
                    </div>
                    <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 text-center'>
                      <p className='text-3xl font-bold text-red-500'>
                        {swapData.summary.high_priority_count}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>High Priority</p>
                    </div>
                    <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 text-center'>
                      <p
                        className={`text-xl font-bold ${swapData.summary.health_status === 'HEALTHY' ? 'text-green-500' : swapData.summary.health_status === 'MODERATE' ? 'text-yellow-500' : 'text-red-500'}`}
                      >
                        {swapData.summary.health_status}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Status</p>
                    </div>
                  </div>

                  {swapData.suggestions.length > 0 ? (
                    <div className='space-y-4'>
                      {swapData.suggestions.map(suggestion => (
                        <div
                          key={suggestion.id}
                          className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border-l-4 ${suggestion.priority >= 8 ? 'border-red-500' : suggestion.priority >= 5 ? 'border-yellow-500' : 'border-blue-500'} shadow-sm`}
                        >
                          <div className='flex items-center justify-between mb-4'>
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-full ${suggestion.type === 'take_profit' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : suggestion.type === 'rebalance' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'}`}
                            >
                              {suggestion.type.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className='text-xs text-gray-500'>
                              Priority: {suggestion.priority}/10
                            </span>
                          </div>

                          <div className='flex items-center justify-center gap-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-4'>
                            <div className='text-center'>
                              <CryptoIcon
                                symbol={suggestion.from_symbol}
                                size={32}
                                className='mx-auto mb-2'
                              />
                              <p className='font-bold text-gray-900 dark:text-white'>
                                {suggestion.from_symbol}
                              </p>
                              <p className='text-xs text-gray-500'>From</p>
                            </div>
                            <ArrowRightLeft className='w-6 h-6 text-gray-400' />
                            <div className='text-center'>
                              <CryptoIcon
                                symbol={suggestion.to_symbol}
                                size={32}
                                className='mx-auto mb-2'
                              />
                              <p className='font-bold text-green-500'>{suggestion.to_symbol}</p>
                              <p className='text-xs text-gray-500'>To</p>
                            </div>
                          </div>

                          <div className='text-center mb-4'>
                            <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                              {formatCurrency(suggestion.suggested_amount_usd)}
                            </p>
                            <p className='text-xs text-gray-500'>Suggested Amount</p>
                          </div>

                          <p className='text-sm text-gray-600 dark:text-gray-400'>
                            {suggestion.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='bg-green-50 dark:bg-green-900/20 rounded-2xl p-8 text-center border border-green-200 dark:border-green-800'>
                      <CheckCircle className='w-12 h-12 text-green-500 mx-auto mb-4' />
                      <p className='text-lg font-bold text-green-600 dark:text-green-400'>
                        Portfolio is Balanced!
                      </p>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        No rebalancing needed
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className='flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400'>
                  <ArrowRightLeft className='w-16 h-16 mb-4 opacity-30' />
                  <p>No suggestions available</p>
                </div>
              )}
            </div>
          )}

          {/* Indicators Tab */}
          {activeTab === 'indicators' && (
            <div className='space-y-4'>
              <div className='flex items-center gap-3 flex-wrap'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Select Asset:</span>
                {portfolio.map(asset => (
                  <button
                    key={asset.symbol}
                    onClick={() => setSelectedSymbol(asset.symbol)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${selectedSymbol === asset.symbol ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400'}`}
                  >
                    <CryptoIcon symbol={asset.symbol} size={20} />
                    <span className='text-sm font-medium'>{asset.symbol}</span>
                  </button>
                ))}
              </div>

              {indicatorsData ? (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center justify-between mb-4'>
                      <h4 className='font-bold text-gray-900 dark:text-white'>RSI (14)</h4>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${(indicatorsData.indicators.momentum.rsi.value || 0) > 70 ? 'bg-red-100 text-red-600' : (indicatorsData.indicators.momentum.rsi.value || 0) < 30 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}
                      >
                        {indicatorsData.indicators.momentum.rsi.signal || 'N/A'}
                      </span>
                    </div>
                    <p className='text-4xl font-bold text-gray-900 dark:text-white mb-4'>
                      {safeToFixed(indicatorsData.indicators.momentum.rsi.value, 1)}
                    </p>
                    <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                      <div
                        className={`h-full rounded-full ${(indicatorsData.indicators.momentum.rsi.value || 0) > 70 ? 'bg-red-500' : (indicatorsData.indicators.momentum.rsi.value || 0) < 30 ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${indicatorsData.indicators.momentum.rsi.value || 0}%` }}
                      />
                    </div>
                    <div className='flex justify-between text-xs text-gray-500 mt-2'>
                      <span>0</span>
                      <span>30</span>
                      <span>70</span>
                      <span>100</span>
                    </div>
                  </div>

                  <div className='bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center justify-between mb-4'>
                      <h4 className='font-bold text-gray-900 dark:text-white'>MACD</h4>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${indicatorsData.indicators.trend.macd.trend.toLowerCase().includes('bullish') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                      >
                        {indicatorsData.indicators.trend.macd.trend || 'N/A'}
                      </span>
                    </div>
                    <div className='grid grid-cols-3 gap-3'>
                      <div className='text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
                        <p className='text-xs text-gray-500 mb-1'>MACD</p>
                        <p
                          className={`text-lg font-bold ${(indicatorsData.indicators.trend.macd.macd || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}
                        >
                          {safeToFixed(indicatorsData.indicators.trend.macd.macd, 2)}
                        </p>
                      </div>
                      <div className='text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
                        <p className='text-xs text-gray-500 mb-1'>Signal</p>
                        <p className='text-lg font-bold text-yellow-500'>
                          {safeToFixed(indicatorsData.indicators.trend.macd.signal, 2)}
                        </p>
                      </div>
                      <div className='text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
                        <p className='text-xs text-gray-500 mb-1'>Histogram</p>
                        <p
                          className={`text-lg font-bold ${(indicatorsData.indicators.trend.macd.histogram || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}
                        >
                          {safeToFixed(indicatorsData.indicators.trend.macd.histogram, 2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center justify-between mb-4'>
                      <h4 className='font-bold text-gray-900 dark:text-white'>Bollinger Bands</h4>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${(indicatorsData.indicators.volatility.bollinger.signal || '').toLowerCase().includes('overbought') ? 'bg-red-100 text-red-600' : (indicatorsData.indicators.volatility.bollinger.signal || '').toLowerCase().includes('oversold') ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}
                      >
                        {indicatorsData.indicators.volatility.bollinger.signal || 'N/A'}
                      </span>
                    </div>
                    <div className='grid grid-cols-4 gap-2'>
                      <div className='text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                        <p className='text-[10px] text-gray-500'>Upper</p>
                        <p className='text-sm font-bold text-red-500'>
                          ${safeToFixed(indicatorsData.indicators.volatility.bollinger.upper, 0)}
                        </p>
                      </div>
                      <div className='text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                        <p className='text-[10px] text-gray-500'>Middle</p>
                        <p className='text-sm font-bold text-yellow-500'>
                          ${safeToFixed(indicatorsData.indicators.volatility.bollinger.middle, 0)}
                        </p>
                      </div>
                      <div className='text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                        <p className='text-[10px] text-gray-500'>Lower</p>
                        <p className='text-sm font-bold text-green-500'>
                          ${safeToFixed(indicatorsData.indicators.volatility.bollinger.lower, 0)}
                        </p>
                      </div>
                      <div className='text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                        <p className='text-[10px] text-gray-500'>Position</p>
                        <p className='text-sm font-bold text-gray-900 dark:text-white'>
                          {safeToFixed(
                            (indicatorsData.indicators.volatility.bollinger.position || 0) * 100,
                            0
                          )}
                          %
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700'>
                    <h4 className='font-bold text-gray-900 dark:text-white mb-4'>
                      Moving Averages
                    </h4>
                    <div className='grid grid-cols-3 gap-3'>
                      <div className='text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
                        <p className='text-xs text-gray-500 mb-1'>SMA 20</p>
                        <p className='text-lg font-bold text-blue-500'>
                          ${safeToFixed(indicatorsData.indicators.trend.sma.sma_20, 0) || 'N/A'}
                        </p>
                      </div>
                      <div className='text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
                        <p className='text-xs text-gray-500 mb-1'>SMA 50</p>
                        <p className='text-lg font-bold text-purple-500'>
                          ${safeToFixed(indicatorsData.indicators.trend.sma.sma_50, 0) || 'N/A'}
                        </p>
                      </div>
                      <div className='text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
                        <p className='text-xs text-gray-500 mb-1'>SMA 200</p>
                        <p className='text-lg font-bold text-orange-500'>
                          ${safeToFixed(indicatorsData.indicators.trend.sma.sma_200, 0) || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400'>
                  <Activity className='w-16 h-16 mb-4 opacity-30' />
                  <p>No indicators data available</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className='flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-4'>
        <Shield className='w-4 h-4 text-green-500' />
        <span>AI analysis powered by machine learning • Data updates every 5 minutes</span>
      </div>
    </div>
  )
}
