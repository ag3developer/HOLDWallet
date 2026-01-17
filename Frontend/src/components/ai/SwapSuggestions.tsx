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
  Sparkles,
  PieChart,
  Target,
} from 'lucide-react'
import { SwapSuggestionsResult, SwapSuggestion } from '@/services/aiService'
import { CryptoIcon } from '@/components/CryptoIcon'

interface SwapSuggestionsProps {
  data: SwapSuggestionsResult | null
  loading?: boolean
  error?: string | null
  onExecuteSwap?: (suggestion: SwapSuggestion) => void
}

const getPriorityStyle = (priority: number) => {
  if (priority >= 8) {
    return {
      bg: 'bg-gradient-to-r from-red-500/10 to-rose-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      label: 'Alta',
      icon: Zap,
    }
  }
  if (priority >= 5) {
    return {
      bg: 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      label: 'Média',
      icon: AlertTriangle,
    }
  }
  return {
    bg: 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    label: 'Baixa',
    icon: Shield,
  }
}

const getTypeStyle = (type: string) => {
  switch (type) {
    case 'take_profit':
      return {
        bg: 'bg-gradient-to-r from-green-500/10 to-emerald-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        label: 'Take Profit',
      }
    case 'reduce_correlation':
      return {
        bg: 'bg-gradient-to-r from-purple-500/10 to-violet-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
        label: 'Reduzir Correlação',
      }
    case 'rebalance':
      return {
        bg: 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        label: 'Rebalancear',
      }
    case 'accumulate':
      return {
        bg: 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        label: 'Acumular',
      }
    default:
      return {
        bg: 'bg-gradient-to-r from-gray-500/10 to-slate-500/10',
        border: 'border-gray-500/30',
        text: 'text-gray-400',
        label: type,
      }
  }
}

const getHealthStyle = (status: string) => {
  switch (status) {
    case 'HEALTHY':
      return {
        bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20',
        border: 'border-green-500/30',
        text: 'text-green-400',
        label: 'Saudável',
      }
    case 'MODERATE':
      return {
        bg: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        label: 'Moderado',
      }
    default:
      return {
        bg: 'bg-gradient-to-r from-red-500/20 to-rose-500/20',
        border: 'border-red-500/30',
        text: 'text-red-400',
        label: 'Atenção',
      }
  }
}

// Helper functions for allocation diff styling
const getAllocationDiffColor = (diff: number) => {
  if (Math.abs(diff) > 10) return 'text-red-400'
  if (Math.abs(diff) > 5) return 'text-yellow-400'
  return 'text-green-400'
}

const getAllocationBarColor = (diff: number) => {
  if (Math.abs(diff) > 10) return 'bg-gradient-to-r from-red-500 to-rose-500'
  if (Math.abs(diff) > 5) return 'bg-gradient-to-r from-yellow-500 to-amber-500'
  return 'bg-gradient-to-r from-green-500 to-emerald-500'
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
      <div className='flex flex-col items-center justify-center p-12 space-y-4 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='relative'>
          <div className='absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse' />
          <div className='relative p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full'>
            <ArrowRightLeft className='w-10 h-10 text-blue-500' />
          </div>
        </div>
        <Loader2 className='w-6 h-6 text-blue-500 animate-spin' />
        <p className='text-sm text-gray-500 dark:text-gray-400'>Analisando portfólio...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center gap-3 p-5 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 rounded-2xl'>
        <div className='p-2 bg-red-500/20 rounded-xl'>
          <AlertTriangle className='w-5 h-5 text-red-500' />
        </div>
        <p className='text-sm font-medium text-red-500 dark:text-red-400'>{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className='flex flex-col items-center justify-center p-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4'>
          <ArrowRightLeft className='w-12 h-12 opacity-50' />
        </div>
        <p className='text-sm font-medium'>Nenhuma sugestão de swap disponível</p>
      </div>
    )
  }

  const healthStyle = getHealthStyle(data.summary.health_status)

  return (
    <div className='space-y-5'>
      {/* Premium Header */}
      <div className='flex items-center justify-between p-4 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='flex items-center gap-3'>
          <div className='p-2.5 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl'>
            <ArrowRightLeft className='w-5 h-5 text-blue-500' />
          </div>
          <div>
            <h3 className='text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2'>
              Swap Suggestions
              <Sparkles className='w-4 h-4 text-yellow-500' />
            </h3>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Recomendações inteligentes</p>
          </div>
        </div>
        <span
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl ${healthStyle.bg} ${healthStyle.text} border ${healthStyle.border}`}
        >
          {healthStyle.label}
        </span>
      </div>

      {/* Premium Summary Card */}
      <div className='grid grid-cols-2 gap-4 p-5 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl'>
          <div className='flex items-center justify-center gap-2 mb-2'>
            <PieChart className='w-4 h-4 text-gray-400' />
          </div>
          <p className='text-2xl font-bold text-gray-900 dark:text-white'>
            {data.summary.total_suggestions}
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Sugestões</p>
        </div>
        <div className='text-center p-3 bg-blue-500/10 rounded-xl'>
          <div className='flex items-center justify-center gap-2 mb-2'>
            <Target className='w-4 h-4 text-blue-400' />
          </div>
          <p className='text-2xl font-bold text-blue-400'>
            {data.summary.portfolio_balance_score}%
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Score</p>
        </div>
        <div className='text-center p-3 bg-red-500/10 rounded-xl'>
          <div className='flex items-center justify-center gap-2 mb-2'>
            <Zap className='w-4 h-4 text-red-400' />
          </div>
          <p className='text-2xl font-bold text-red-400'>{data.summary.high_priority_count}</p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Alta Prioridade</p>
        </div>
        <div className='text-center p-3 bg-green-500/10 rounded-xl'>
          <div className='flex items-center justify-center gap-2 mb-2'>
            <TrendingUp className='w-4 h-4 text-green-400' />
          </div>
          <p className='text-2xl font-bold text-green-400'>
            {formatUSD(data.summary.total_suggested_swap_value)}
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Valor Total</p>
        </div>
      </div>

      {/* No suggestions - healthy portfolio */}
      {data.suggestions.length === 0 && (
        <div className='flex flex-col items-center justify-center p-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl'>
          <div className='relative mb-4'>
            <div className='absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse' />
            <div className='relative p-4 bg-green-500/20 rounded-full'>
              <CheckCircle className='w-10 h-10 text-green-400' />
            </div>
          </div>
          <p className='text-lg font-bold text-green-400'>Portfólio Saudável</p>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
            Nenhum rebalanceamento necessário no momento
          </p>
        </div>
      )}

      {/* Suggestion Cards */}
      <div className='space-y-4'>
        {data.suggestions.map(suggestion => {
          const priorityStyle = getPriorityStyle(suggestion.priority)
          const typeStyle = getTypeStyle(suggestion.type)
          const PriorityIcon = priorityStyle.icon

          return (
            <div
              key={suggestion.id}
              className={`relative overflow-hidden p-5 rounded-2xl border ${priorityStyle.border} ${priorityStyle.bg} transition-all duration-300 hover:shadow-xl hover:scale-[1.01]`}
            >
              {/* Priority badge */}
              <div className='absolute top-3 right-3'>
                <div
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${priorityStyle.bg} ${priorityStyle.text} border ${priorityStyle.border}`}
                >
                  {suggestion.priority}/10
                </div>
              </div>

              {/* Header row */}
              <div className='flex items-center gap-3 mb-4'>
                <div className={`p-2 rounded-xl ${priorityStyle.bg}`}>
                  <PriorityIcon className={`w-5 h-5 ${priorityStyle.text}`} />
                </div>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}
                >
                  {typeStyle.label}
                </span>
              </div>

              {/* Swap visual */}
              <div className='flex items-center justify-center gap-6 p-4 bg-white dark:bg-gray-800/50 rounded-xl mb-4 shadow-inner'>
                <div className='text-center'>
                  <div className='p-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-2'>
                    <CryptoIcon symbol={suggestion.from_symbol} size={36} className='mx-auto' />
                  </div>
                  <p className='text-lg font-bold text-gray-900 dark:text-white'>
                    {suggestion.from_symbol}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>De</p>
                </div>
                <div className='flex flex-col items-center'>
                  <div className='p-2 bg-blue-500/20 rounded-full'>
                    <ArrowRight className='w-5 h-5 text-blue-400' />
                  </div>
                </div>
                <div className='text-center'>
                  <div className='p-2 bg-green-500/20 rounded-full mb-2'>
                    <CryptoIcon symbol={suggestion.to_symbol} size={36} className='mx-auto' />
                  </div>
                  <p className='text-lg font-bold text-green-400'>{suggestion.to_symbol}</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>Para</p>
                </div>
              </div>

              {/* Amount */}
              <div className='text-center mb-4 p-3 bg-white dark:bg-gray-800/50 rounded-xl'>
                <p className='text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-500'>
                  {formatUSD(suggestion.suggested_amount_usd)}
                </p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Valor Sugerido</p>
              </div>

              {/* Reason & Impact */}
              <div className='space-y-3'>
                <div className='flex items-start gap-3 p-3 bg-white dark:bg-gray-800/30 rounded-xl'>
                  <TrendingUp className='w-4 h-4 text-blue-400 mt-0.5 shrink-0' />
                  <p className='text-sm text-gray-700 dark:text-gray-200'>{suggestion.reason}</p>
                </div>
                <p className='text-xs text-gray-500 dark:text-gray-400 px-1'>
                  {suggestion.message}
                </p>
              </div>

              {/* Execute Button */}
              {onExecuteSwap && (
                <button
                  onClick={() => onExecuteSwap(suggestion)}
                  className='w-full mt-4 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30'
                >
                  Executar Swap
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Current vs Target Allocation */}
      {Object.keys(data.current_allocations).length > 0 && (
        <div className='p-5 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='p-2 bg-purple-500/20 rounded-xl'>
              <PieChart className='w-5 h-5 text-purple-500' />
            </div>
            <h4 className='text-sm font-bold text-gray-900 dark:text-white'>
              Comparação de Alocação
            </h4>
          </div>
          <div className='space-y-3'>
            {Object.entries(data.current_allocations).map(([symbol, current]) => {
              const target = data.target_allocations[symbol] || 0
              const diff = current - target
              const diffColor = getAllocationDiffColor(diff)
              const barColor = getAllocationBarColor(diff)

              return (
                <div key={symbol} className='flex items-center gap-3'>
                  <div className='flex items-center gap-2 w-16'>
                    <CryptoIcon symbol={symbol} size={16} />
                    <span className='text-xs font-semibold text-gray-600 dark:text-gray-300'>
                      {symbol}
                    </span>
                  </div>
                  <div className='flex-1 h-5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative'>
                    {/* Target marker */}
                    <div
                      className='absolute top-0 bottom-0 w-0.5 bg-white/80 z-10 shadow-sm'
                      style={{ left: `${target}%` }}
                    />
                    {/* Current fill */}
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${Math.min(current, 100)}%` }}
                    />
                  </div>
                  <span className={`w-24 text-xs text-right font-medium ${diffColor}`}>
                    {current.toFixed(1)}% / {target.toFixed(1)}%
                  </span>
                </div>
              )
            })}
          </div>
          <div className='flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50'>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-1 bg-white rounded shadow' />
              <span className='text-xs text-gray-500'>Target</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded' />
              <span className='text-xs text-gray-500'>Atual</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SwapSuggestions
