/**
 * AI Insights Card Component
 *
 * Main component that provides an overview of AI Portfolio Intelligence
 * with quick access to key metrics and insights.
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Brain,
  Target,
  ArrowRightLeft,
  GitBranch,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight,
  Loader2,
  Sparkles,
  Zap,
  TrendingUp,
  Shield,
} from 'lucide-react'
import { ATHAnalysis, CorrelationResult, SwapSuggestionsResult } from '@/services/aiService'

interface AIInsightsCardProps {
  athData?: ATHAnalysis[] | null
  correlationData?: CorrelationResult | null
  swapData?: SwapSuggestionsResult | null
  loading?: boolean
  onNavigate?: (section: string) => void
}

const QuickStat: React.FC<{
  icon: React.ElementType
  label: string
  value: string | number
  subtitle?: string | undefined
  color?: string | undefined
  bgGradient?: string | undefined
  onClick?: (() => void) | undefined
}> = ({
  icon: Icon,
  label,
  value,
  subtitle,
  color = 'text-blue-400',
  bgGradient = 'from-blue-500/10 to-indigo-500/10',
  onClick,
}) => (
  <button
    onClick={onClick}
    className='group relative overflow-hidden flex items-center gap-3 p-4 bg-white dark:bg-gray-800/80 rounded-2xl hover:shadow-lg transition-all duration-300 w-full text-left border border-gray-100 dark:border-gray-700/50'
  >
    <div
      className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
    />
    <div className={`relative p-2.5 rounded-xl bg-gradient-to-br ${bgGradient}`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div className='relative flex-1 min-w-0'>
      <p className='text-xs text-gray-500 dark:text-gray-400 font-medium'>{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {subtitle && (
        <p className='text-[10px] text-gray-400 dark:text-gray-500 truncate'>{subtitle}</p>
      )}
    </div>
    <ChevronRight className='relative w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-transform' />
  </button>
)

const InsightBadge: React.FC<{
  type: 'success' | 'warning' | 'danger' | 'info'
  message: string
}> = ({ type, message }) => {
  const styles = {
    success:
      'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 text-green-500 dark:text-green-400',
    warning:
      'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
    danger:
      'bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30 text-red-500 dark:text-red-400',
    info: 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-500 dark:text-blue-400',
  }

  const icons = {
    success: CheckCircle,
    warning: AlertTriangle,
    danger: AlertTriangle,
    info: Info,
  }

  const Icon = icons[type]

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${styles[type]} backdrop-blur-sm`}
    >
      <Icon className='w-4 h-4 shrink-0' />
      <span className='text-sm font-medium'>{message}</span>
    </div>
  )
}

const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  athData,
  correlationData,
  swapData,
  loading,
  onNavigate,
}) => {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className='relative overflow-hidden p-8 bg-white dark:bg-gray-900/80 rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-xl'>
        <div className='absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/5' />
        <div className='relative flex flex-col items-center justify-center py-8 space-y-4'>
          <div className='relative'>
            <div className='absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-30 animate-pulse' />
            <div className='relative p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full'>
              <Brain className='w-12 h-12 text-blue-500' />
            </div>
            <Sparkles className='w-5 h-5 text-yellow-400 absolute -top-1 -right-1 animate-pulse' />
          </div>
          <Loader2 className='w-6 h-6 text-purple-500 animate-spin' />
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            {t('aiIntelligence.portfolio.analyzing')}
          </p>
        </div>
      </div>
    )
  }

  // Calculate insights from data
  const insights: { type: 'success' | 'warning' | 'danger' | 'info'; message: string }[] = []

  // ATH insights
  if (athData && athData.length > 0) {
    const atAthCount = athData.filter(a => a.at_ath).length
    const avgRecovery = athData.reduce((sum, a) => sum + a.recovery_percent, 0) / athData.length
    const bestUpside = Math.max(...athData.map(a => a.potential_upside_percent))

    if (atAthCount > 0) {
      insights.push({
        type: 'success',
        message: `${atAthCount} asset${atAthCount > 1 ? 's' : ''} at All-Time High`,
      })
    }
    if (avgRecovery < 50) {
      insights.push({
        type: 'warning',
        message: `Portfolio recovery at ${avgRecovery.toFixed(0)}% of ATH`,
      })
    }
    if (bestUpside > 100) {
      insights.push({
        type: 'info',
        message: `Best opportunity: ${bestUpside.toFixed(0)}% potential upside`,
      })
    }
  }

  // Correlation insights
  if (correlationData) {
    if (correlationData.high_correlations.length >= 3) {
      insights.push({
        type: 'danger',
        message: 'High correlation detected - diversification needed',
      })
    } else if (correlationData.low_correlations.length >= 2) {
      insights.push({
        type: 'success',
        message: 'Good portfolio diversification',
      })
    }
  }

  // Swap insights
  if (swapData) {
    if (swapData.summary.high_priority_count > 0) {
      insights.push({
        type: 'warning',
        message: `${swapData.summary.high_priority_count} high-priority rebalancing suggestions`,
      })
    }
    if (swapData.summary.health_status === 'HEALTHY') {
      insights.push({
        type: 'success',
        message: 'Portfolio balance is healthy',
      })
    }
  }

  // Calculate stats
  const portfolioScore = swapData?.summary.portfolio_balance_score || 0
  const totalSuggestions = swapData?.summary.total_suggestions || 0
  const avgRecovery = athData
    ? athData.reduce((sum, a) => sum + a.recovery_percent, 0) / athData.length
    : 0
  const highCorrelations = correlationData?.high_correlations.length || 0

  return (
    <div className='relative overflow-hidden p-6 bg-white dark:bg-gray-900/80 rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-xl'>
      {/* Background decorations */}
      <div className='absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full -translate-y-32 translate-x-32' />
      <div className='absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-500/5 to-blue-500/5 rounded-full translate-y-24 -translate-x-24' />

      {/* Header */}
      <div className='relative flex items-center justify-between mb-6'>
        <div className='flex items-center gap-4'>
          <div className='relative'>
            <div className='absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-40' />
            <div className='relative p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg'>
              <Brain className='w-7 h-7 text-white' />
            </div>
            <div className='absolute -top-1 -right-1 p-1 bg-yellow-400 rounded-full shadow-lg'>
              <Sparkles className='w-3 h-3 text-yellow-900' />
            </div>
          </div>
          <div>
            <h2 className='text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
              {t('aiIntelligence.title')}
              <span className='px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full uppercase'>
                Pro
              </span>
            </h2>
            <p className='text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1'>
              <Zap className='w-3 h-3 text-yellow-500' />
              {t('aiIntelligence.description')}
            </p>
          </div>
        </div>
        <div
          className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
            portfolioScore >= 80
              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-500 border border-green-500/30'
              : portfolioScore >= 60
                ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-500 border border-yellow-500/30'
                : 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-500 border border-red-500/30'
          }`}
        >
          <div className='flex items-center gap-2'>
            <Shield className='w-4 h-4' />
            Score: {portfolioScore}%
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className='relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6'>
        <QuickStat
          icon={Target}
          label={t('aiIntelligence.overview.athRecovery')}
          value={`${avgRecovery.toFixed(0)}%`}
          subtitle={
            athData ? `${athData.length} ${t('aiIntelligence.portfolio.assets')}` : undefined
          }
          color={
            avgRecovery >= 80
              ? 'text-green-500'
              : avgRecovery >= 50
                ? 'text-yellow-500'
                : 'text-red-500'
          }
          bgGradient={
            avgRecovery >= 80
              ? 'from-green-500/10 to-emerald-500/10'
              : avgRecovery >= 50
                ? 'from-yellow-500/10 to-amber-500/10'
                : 'from-red-500/10 to-rose-500/10'
          }
          onClick={() => onNavigate?.('ath')}
        />
        <QuickStat
          icon={GitBranch}
          label={t('aiIntelligence.overview.diversification')}
          value={
            highCorrelations === 0
              ? t('aiIntelligence.swap.health.excellent')
              : `${highCorrelations} ${t('aiIntelligence.overview.indicators')}`
          }
          subtitle={
            correlationData
              ? `${correlationData.symbols.length} ${t('aiIntelligence.portfolio.assets')}`
              : undefined
          }
          color={highCorrelations === 0 ? 'text-green-500' : 'text-orange-500'}
          bgGradient={
            highCorrelations === 0
              ? 'from-green-500/10 to-emerald-500/10'
              : 'from-orange-500/10 to-amber-500/10'
          }
          onClick={() => onNavigate?.('correlation')}
        />
        <QuickStat
          icon={ArrowRightLeft}
          label={t('aiIntelligence.overview.suggestions')}
          value={totalSuggestions}
          subtitle={
            swapData
              ? `${swapData.summary.high_priority_count} ${t('aiIntelligence.swap.priority.high')}`
              : undefined
          }
          color={totalSuggestions === 0 ? 'text-green-500' : 'text-blue-500'}
          bgGradient={
            totalSuggestions === 0
              ? 'from-green-500/10 to-emerald-500/10'
              : 'from-blue-500/10 to-indigo-500/10'
          }
          onClick={() => onNavigate?.('swap')}
        />
        <QuickStat
          icon={Activity}
          label={t('aiIntelligence.overview.healthStatus')}
          value={
            swapData?.summary.health_status === 'HEALTHY'
              ? t('aiIntelligence.swap.health.excellent')
              : swapData?.summary.health_status === 'MODERATE'
                ? t('aiIntelligence.swap.health.fair')
                : swapData?.summary.health_status || 'N/A'
          }
          color={
            swapData?.summary.health_status === 'HEALTHY'
              ? 'text-green-500'
              : swapData?.summary.health_status === 'MODERATE'
                ? 'text-yellow-500'
                : 'text-red-500'
          }
          bgGradient={
            swapData?.summary.health_status === 'HEALTHY'
              ? 'from-green-500/10 to-emerald-500/10'
              : swapData?.summary.health_status === 'MODERATE'
                ? 'from-yellow-500/10 to-amber-500/10'
                : 'from-red-500/10 to-rose-500/10'
          }
          onClick={() => onNavigate?.('indicators')}
        />
      </div>

      {/* Key Insights */}
      {insights.length > 0 && (
        <div className='relative space-y-3'>
          <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3'>
            <TrendingUp className='w-4 h-4 text-blue-500' />
            {t('aiIntelligence.overview.title')}
          </h3>
          <div className='grid gap-2 sm:grid-cols-2'>
            {insights.slice(0, 4).map((insight, idx) => (
              <InsightBadge
                key={`insight-${insight.type}-${idx}`}
                type={insight.type}
                message={insight.message}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Data State */}
      {!athData && !correlationData && !swapData && (
        <div className='relative flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400'>
          <div className='p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4'>
            <Brain className='w-10 h-10 opacity-50' />
          </div>
          <p className='text-sm font-medium'>{t('aiIntelligence.errors.noData')}</p>
          <p className='text-xs mt-1'>{t('aiIntelligence.errors.insufficientData')}</p>
        </div>
      )}

      {/* Powered by AI badge */}
      <div className='relative mt-6 pt-4 border-t border-gray-200 dark:border-gray-700/50 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500'>
        <Sparkles className='w-3 h-3 text-yellow-500' />
        <span>{t('aiIntelligence.lastUpdate')}</span>
      </div>
    </div>
  )
}

export default AIInsightsCard
