/**
 * AI Insights Card Component
 *
 * Main component that provides an overview of AI Portfolio Intelligence
 * with quick access to key metrics and insights.
 */

import React from 'react'
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
  onClick?: (() => void) | undefined
}> = ({ icon: Icon, label, value, subtitle, color = 'text-blue-400', onClick }) => (
  <button
    onClick={onClick}
    className='flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-all w-full text-left'
  >
    <div className={`p-2 rounded-lg bg-gray-200 dark:bg-gray-700/50`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div className='flex-1 min-w-0'>
      <p className='text-xs text-gray-500 dark:text-gray-400'>{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {subtitle && <p className='text-xs text-gray-400 dark:text-gray-500 truncate'>{subtitle}</p>}
    </div>
    <ChevronRight className='w-4 h-4 text-gray-400 dark:text-gray-500' />
  </button>
)

const InsightBadge: React.FC<{
  type: 'success' | 'warning' | 'danger' | 'info'
  message: string
}> = ({ type, message }) => {
  const styles = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    danger: 'bg-red-500/10 border-red-500/30 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  }

  const icons = {
    success: CheckCircle,
    warning: AlertTriangle,
    danger: AlertTriangle,
    info: Info,
  }

  const Icon = icons[type]

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${styles[type]}`}>
      <Icon className='w-4 h-4 shrink-0' />
      <span className='text-xs'>{message}</span>
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
  if (loading) {
    return (
      <div className='p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='flex flex-col items-center justify-center py-8 space-y-4'>
          <div className='relative'>
            <Brain className='w-12 h-12 text-blue-500' />
            <Sparkles className='w-5 h-5 text-yellow-400 absolute -top-1 -right-1 animate-pulse' />
          </div>
          <Loader2 className='w-6 h-6 text-blue-500 animate-spin' />
          <p className='text-sm text-gray-500 dark:text-gray-400'>Analyzing your portfolio...</p>
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
    <div className='p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <div className='relative'>
            <Brain className='w-8 h-8 text-blue-500' />
            <Sparkles className='w-4 h-4 text-yellow-400 absolute -top-1 -right-1' />
          </div>
          <div>
            <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
              AI Portfolio Intelligence
            </h2>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Powered by machine learning</p>
          </div>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            portfolioScore >= 80
              ? 'bg-green-500/20 text-green-400'
              : portfolioScore >= 60
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
          }`}
        >
          Score: {portfolioScore}%
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4'>
        <QuickStat
          icon={Target}
          label='ATH Recovery'
          value={`${avgRecovery.toFixed(0)}%`}
          subtitle={athData ? `${athData.length} assets analyzed` : undefined}
          color={
            avgRecovery >= 80
              ? 'text-green-400'
              : avgRecovery >= 50
                ? 'text-yellow-400'
                : 'text-red-400'
          }
          onClick={() => onNavigate?.('ath')}
        />
        <QuickStat
          icon={GitBranch}
          label='Diversification'
          value={highCorrelations === 0 ? 'Good' : `${highCorrelations} issues`}
          subtitle={correlationData ? `${correlationData.symbols.length} pairs` : undefined}
          color={highCorrelations === 0 ? 'text-green-400' : 'text-orange-400'}
          onClick={() => onNavigate?.('correlation')}
        />
        <QuickStat
          icon={ArrowRightLeft}
          label='Suggestions'
          value={totalSuggestions}
          subtitle={swapData ? `${swapData.summary.high_priority_count} high priority` : undefined}
          color={totalSuggestions === 0 ? 'text-green-400' : 'text-blue-400'}
          onClick={() => onNavigate?.('swap')}
        />
        <QuickStat
          icon={Activity}
          label='Health Status'
          value={swapData?.summary.health_status || 'N/A'}
          color={
            swapData?.summary.health_status === 'HEALTHY'
              ? 'text-green-400'
              : swapData?.summary.health_status === 'MODERATE'
                ? 'text-yellow-400'
                : 'text-red-400'
          }
          onClick={() => onNavigate?.('indicators')}
        />
      </div>

      {/* Key Insights */}
      {insights.length > 0 && (
        <div className='space-y-2'>
          <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-2'>
            Key Insights
          </h3>
          {insights.slice(0, 4).map((insight, idx) => (
            <InsightBadge
              key={`insight-${insight.type}-${idx}`}
              type={insight.type}
              message={insight.message}
            />
          ))}
        </div>
      )}

      {/* No Data State */}
      {!athData && !correlationData && !swapData && (
        <div className='flex flex-col items-center justify-center py-6 text-gray-500 dark:text-gray-400'>
          <Brain className='w-10 h-10 mb-3 opacity-50' />
          <p className='text-sm'>Add assets to get AI insights</p>
          <p className='text-xs mt-1'>Portfolio analysis requires at least 2 assets</p>
        </div>
      )}

      {/* Powered by AI badge */}
      <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500'>
        <Sparkles className='w-3 h-3' />
        <span>AI analysis updates every 5 minutes</span>
      </div>
    </div>
  )
}

export default AIInsightsCard
