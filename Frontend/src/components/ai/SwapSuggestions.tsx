/**
 * Swap Suggestions Component
 *
 * Displays AI-powered rebalancing recommendations
 * with profit-taking and accumulation suggestions.
 */

import React from 'react'
import {
  ArrowRightLeft,
  TrendingUp,
  AlertTriangle,
  Shield,
  Zap,
  Loader2,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import { SwapSuggestionsResult, SwapSuggestion } from '@/services/aiService'

interface SwapSuggestionsProps {
  data: SwapSuggestionsResult | null
  loading?: boolean
  error?: string | null
  onExecuteSwap?: (suggestion: SwapSuggestion) => void
}

const getPriorityStyle = (priority: number) => {
  if (priority >= 8) {
    return {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      label: 'High',
      icon: Zap,
    }
  }
  if (priority >= 5) {
    return {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      label: 'Medium',
      icon: AlertTriangle,
    }
  }
  return {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    label: 'Low',
    icon: Shield,
  }
}

const getTypeStyle = (type: string) => {
  switch (type) {
    case 'take_profit':
      return {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        label: 'Take Profit',
      }
    case 'reduce_correlation':
      return {
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        label: 'Reduce Correlation',
      }
    case 'rebalance':
      return {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        label: 'Rebalance',
      }
    case 'accumulate':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        label: 'Accumulate',
      }
    default:
      return {
        bg: 'bg-gray-500/10',
        text: 'text-gray-400',
        label: type,
      }
  }
}

const getHealthStyle = (status: string) => {
  switch (status) {
    case 'HEALTHY':
      return {
        bg: 'bg-green-500/20',
        border: 'border-green-500/30',
        text: 'text-green-400',
      }
    case 'MODERATE':
      return {
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
      }
    default:
      return {
        bg: 'bg-red-500/20',
        border: 'border-red-500/30',
        text: 'text-red-400',
      }
  }
}

const formatUSD = (value: number): string => {
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

const SwapSuggestions: React.FC<SwapSuggestionsProps> = ({
  data,
  loading,
  error,
  onExecuteSwap,
}) => {
  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center p-8 space-y-4'>
        <Loader2 className='w-8 h-8 text-blue-500 animate-spin' />
        <p className='text-sm text-gray-500 dark:text-gray-400'>Analyzing portfolio...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg'>
        <AlertTriangle className='w-5 h-5 text-red-400' />
        <p className='text-sm text-red-400'>{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className='flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400'>
        <ArrowRightLeft className='w-12 h-12 mb-3 opacity-50' />
        <p className='text-sm'>No swap suggestions available</p>
      </div>
    )
  }

  const healthStyle = getHealthStyle(data.summary.health_status)

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <ArrowRightLeft className='w-5 h-5 text-blue-400' />
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Swap Suggestions</h3>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${healthStyle.bg} ${healthStyle.text} border ${healthStyle.border}`}
        >
          {data.summary.health_status}
        </span>
      </div>

      {/* Summary Card */}
      <div className='grid grid-cols-2 gap-3 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl'>
        <div className='text-center'>
          <p className='text-2xl font-bold text-gray-900 dark:text-white'>
            {data.summary.total_suggestions}
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Suggestions</p>
        </div>
        <div className='text-center'>
          <p className='text-2xl font-bold text-blue-400'>
            {data.summary.portfolio_balance_score}%
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Balance Score</p>
        </div>
        <div className='text-center'>
          <p className='text-2xl font-bold text-red-400'>{data.summary.high_priority_count}</p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>High Priority</p>
        </div>
        <div className='text-center'>
          <p className='text-2xl font-bold text-green-400'>
            {formatUSD(data.summary.total_suggested_swap_value)}
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Total Value</p>
        </div>
      </div>

      {/* No suggestions - healthy portfolio */}
      {data.suggestions.length === 0 && (
        <div className='flex flex-col items-center justify-center p-6 bg-green-500/10 border border-green-500/30 rounded-xl'>
          <CheckCircle className='w-10 h-10 text-green-400 mb-3' />
          <p className='text-lg font-medium text-green-400'>Portfolio is Healthy</p>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
            No rebalancing needed at this time
          </p>
        </div>
      )}

      {/* Suggestion Cards */}
      <div className='space-y-3'>
        {data.suggestions.map(suggestion => {
          const priorityStyle = getPriorityStyle(suggestion.priority)
          const typeStyle = getTypeStyle(suggestion.type)
          const PriorityIcon = priorityStyle.icon

          return (
            <div
              key={suggestion.id}
              className={`p-4 rounded-xl border ${priorityStyle.border} ${priorityStyle.bg} transition-all hover:scale-[1.01]`}
            >
              {/* Header row */}
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <PriorityIcon className={`w-4 h-4 ${priorityStyle.text}`} />
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeStyle.bg} ${typeStyle.text}`}
                  >
                    {typeStyle.label}
                  </span>
                </div>
                <span className={`text-xs font-medium ${priorityStyle.text}`}>
                  Priority: {suggestion.priority}/10
                </span>
              </div>

              {/* Swap visual */}
              <div className='flex items-center justify-center gap-4 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg mb-3'>
                <div className='text-center'>
                  <p className='text-lg font-bold text-gray-900 dark:text-white'>
                    {suggestion.from_symbol}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>From</p>
                </div>
                <ArrowRight className='w-5 h-5 text-gray-400' />
                <div className='text-center'>
                  <p className='text-lg font-bold text-green-400'>{suggestion.to_symbol}</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>To</p>
                </div>
              </div>

              {/* Amount */}
              <div className='text-center mb-3'>
                <p className='text-xl font-bold text-gray-900 dark:text-white'>
                  {formatUSD(suggestion.suggested_amount_usd)}
                </p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Suggested Amount</p>
              </div>

              {/* Reason & Impact */}
              <div className='space-y-2 text-sm'>
                <div className='flex items-start gap-2'>
                  <TrendingUp className='w-4 h-4 text-blue-400 mt-0.5 shrink-0' />
                  <p className='text-gray-600 dark:text-gray-300'>{suggestion.reason}</p>
                </div>
                <p className='text-xs text-gray-500 dark:text-gray-400'>{suggestion.message}</p>
              </div>

              {/* Execute Button */}
              {onExecuteSwap && (
                <button
                  onClick={() => onExecuteSwap(suggestion)}
                  className='w-full mt-3 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors'
                >
                  Execute Swap
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Current vs Target Allocation */}
      {Object.keys(data.current_allocations).length > 0 && (
        <div className='p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl'>
          <h4 className='text-sm font-medium text-gray-900 dark:text-white mb-3'>
            Allocation Comparison
          </h4>
          <div className='space-y-2'>
            {Object.entries(data.current_allocations).map(([symbol, current]) => {
              const target = data.target_allocations[symbol] || 0
              const diff = current - target

              return (
                <div key={symbol} className='flex items-center gap-3'>
                  <span className='w-12 text-xs font-medium text-gray-600 dark:text-gray-300'>
                    {symbol}
                  </span>
                  <div className='flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative'>
                    {/* Target marker */}
                    <div
                      className='absolute top-0 bottom-0 w-0.5 bg-white z-10'
                      style={{ left: `${target}%` }}
                    />
                    {/* Current fill */}
                    <div
                      className={`h-full rounded-full ${
                        Math.abs(diff) > 10
                          ? 'bg-red-500'
                          : Math.abs(diff) > 5
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(current, 100)}%` }}
                    />
                  </div>
                  <span
                    className={`w-16 text-xs text-right ${
                      Math.abs(diff) > 10
                        ? 'text-red-400'
                        : Math.abs(diff) > 5
                          ? 'text-yellow-400'
                          : 'text-green-400'
                    }`}
                  >
                    {current.toFixed(1)}% / {target.toFixed(1)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SwapSuggestions
