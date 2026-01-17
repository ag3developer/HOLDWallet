/**
 * ATH Analysis Component
 *
 * Shows All-Time High analysis for portfolio assets
 * with zone indicators and potential upside calculations.
 */

import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  ArrowUp,
  Clock,
  Loader2,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'
import { ATHAnalysis as ATHAnalysisType } from '@/services/aiService'
import { CryptoIcon } from '@/components/CryptoIcon'

interface ATHAnalysisProps {
  data: ATHAnalysisType[] | null
  loading?: boolean
  error?: string | null
  formatCurrency?: (amountUSD: number) => string
}

// Zone color mapping
const getZoneStyle = (zone: string) => {
  switch (zone) {
    case 'ATH_ZONE':
      return {
        bg: 'bg-gradient-to-r from-green-500/10 to-emerald-500/10',
        border: 'border-green-500/30',
        text: 'text-green-500 dark:text-green-400',
        label: 'ATH Zone',
        icon: Trophy,
      }
    case 'STRONG':
      return {
        bg: 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-500 dark:text-emerald-400',
        label: 'Forte',
        icon: TrendingUp,
      }
    case 'RECOVERING':
      return {
        bg: 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-500 dark:text-yellow-400',
        label: 'Recuperando',
        icon: Zap,
      }
    case 'WEAK':
      return {
        bg: 'bg-gradient-to-r from-orange-500/10 to-amber-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-500 dark:text-orange-400',
        label: 'Fraco',
        icon: AlertTriangle,
      }
    case 'CAPITULATION':
      return {
        bg: 'bg-gradient-to-r from-red-500/10 to-rose-500/10',
        border: 'border-red-500/30',
        text: 'text-red-500 dark:text-red-400',
        label: 'Capitulação',
        icon: TrendingDown,
      }
    default:
      return {
        bg: 'bg-gradient-to-r from-gray-500/10 to-slate-500/10',
        border: 'border-gray-500/30',
        text: 'text-gray-500 dark:text-gray-400',
        label: 'Desconhecido',
        icon: AlertTriangle,
      }
  }
}

const formatNumber = (num: number, decimals: number = 2) => {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`
  return `$${num.toFixed(decimals)}`
}

const ATHAnalysis: React.FC<ATHAnalysisProps> = ({ data, loading, error, formatCurrency }) => {
  // Helper: format price with user currency or fallback
  const formatPrice = (value: number) => {
    if (formatCurrency) {
      return formatCurrency(value)
    }
    return formatNumber(value)
  }

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center p-12 space-y-4 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='relative'>
          <div className='absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse' />
          <div className='relative p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full'>
            <Target className='w-10 h-10 text-blue-500' />
          </div>
        </div>
        <Loader2 className='w-6 h-6 text-blue-500 animate-spin' />
        <p className='text-sm text-gray-500 dark:text-gray-400'>Analisando dados ATH...</p>
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

  if (!data || data.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center p-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4'>
          <Target className='w-12 h-12 opacity-50' />
        </div>
        <p className='text-sm font-medium'>Nenhum dado ATH disponível</p>
      </div>
    )
  }

  // Sort by potential upside (best opportunities first)
  const sortedData = [...data].sort(
    (a, b) => b.potential_upside_percent - a.potential_upside_percent
  )

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='flex items-center gap-3'>
          <div className='p-2.5 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl'>
            <Target className='w-5 h-5 text-blue-500' />
          </div>
          <div>
            <h3 className='text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2'>
              ATH Analysis
              <Sparkles className='w-4 h-4 text-yellow-500' />
            </h3>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Análise All-Time High</p>
          </div>
        </div>
        <div className='px-3 py-1.5 bg-blue-500/10 rounded-xl'>
          <span className='text-sm font-semibold text-blue-500'>{data.length} ativos</span>
        </div>
      </div>

      {/* Asset Cards */}
      <div className='grid gap-4 md:grid-cols-2'>
        {sortedData.map((asset, index) => {
          const zoneStyle = getZoneStyle(asset.zone)
          const ZoneIcon = zoneStyle.icon

          // Determine progress bar gradient
          const getProgressGradient = (zone: string) => {
            if (zone === 'ATH_ZONE') return 'bg-gradient-to-r from-green-500 to-green-400'
            if (zone === 'STRONG') return 'bg-gradient-to-r from-emerald-500 to-emerald-400'
            if (zone === 'RECOVERING') return 'bg-gradient-to-r from-yellow-500 to-yellow-400'
            if (zone === 'WEAK') return 'bg-gradient-to-r from-orange-500 to-orange-400'
            return 'bg-gradient-to-r from-red-500 to-red-400'
          }

          // Determine distance color
          const getDistanceColor = (percent: number) => {
            if (percent > 20) return 'text-red-400'
            if (percent > 10) return 'text-yellow-400'
            return 'text-green-400'
          }

          const progressGradient = getProgressGradient(asset.zone)
          const distanceColor = getDistanceColor(asset.distance_from_ath_percent)

          return (
            <div
              key={asset.symbol}
              className={`relative overflow-hidden p-5 rounded-2xl border ${zoneStyle.border} ${zoneStyle.bg} transition-all duration-300 hover:shadow-xl hover:scale-[1.01]`}
            >
              {/* Rank badge for top 3 */}
              {index < 3 && (
                <div className='absolute top-3 right-3 w-7 h-7 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg'>
                  <span className='text-xs font-bold text-white'>#{index + 1}</span>
                </div>
              )}

              {/* Zone icon decoration */}
              <div className='absolute -bottom-4 -right-4 opacity-5'>
                <ZoneIcon className='w-24 h-24' />
              </div>

              {/* Top row: Symbol, Zone, ATH status */}
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-3'>
                  <CryptoIcon symbol={asset.symbol} size={28} />
                  <span className='text-lg font-bold text-gray-900 dark:text-white'>
                    {asset.symbol}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${zoneStyle.bg} ${zoneStyle.text} border ${zoneStyle.border}`}
                  >
                    {zoneStyle.label}
                  </span>
                </div>
                {asset.at_ath && (
                  <div className='flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full'>
                    <TrendingUp className='w-3 h-3 text-green-400' />
                    <span className='text-xs font-medium text-green-400'>AT ATH</span>
                  </div>
                )}
              </div>

              {/* Price row */}
              <div className='grid grid-cols-2 gap-4 mb-3'>
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Current Price</p>
                  <p className='text-base font-semibold text-gray-900 dark:text-white'>
                    {formatPrice(asset.current_price)}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>ATH Price</p>
                  <p className='text-base font-semibold text-gray-600 dark:text-gray-300'>
                    {formatPrice(asset.ath_price)}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className='mb-3'>
                <div className='flex justify-between mb-1'>
                  <span className='text-xs text-gray-500 dark:text-gray-400'>Recovery</span>
                  <span className={`text-xs font-medium ${zoneStyle.text}`}>
                    {asset.recovery_percent.toFixed(1)}%
                  </span>
                </div>
                <div className='h-2 bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden'>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressGradient}`}
                    style={{ width: `${Math.min(asset.recovery_percent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className='grid grid-cols-3 gap-2 text-center'>
                <div className='p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
                  <div className='flex items-center justify-center gap-1 mb-1'>
                    {asset.distance_from_ath_percent > 0 ? (
                      <TrendingDown className='w-3 h-3 text-red-400' />
                    ) : (
                      <TrendingUp className='w-3 h-3 text-green-400' />
                    )}
                    <span className='text-xs text-gray-500 dark:text-gray-400'>From ATH</span>
                  </div>
                  <p className={`text-sm font-bold ${distanceColor}`}>
                    -{asset.distance_from_ath_percent.toFixed(1)}%
                  </p>
                </div>

                <div className='p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
                  <div className='flex items-center justify-center gap-1 mb-1'>
                    <ArrowUp className='w-3 h-3 text-blue-400' />
                    <span className='text-xs text-gray-500 dark:text-gray-400'>Upside</span>
                  </div>
                  <p className='text-sm font-bold text-blue-400'>
                    +{asset.potential_upside_percent.toFixed(1)}%
                  </p>
                </div>

                <div className='p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
                  <div className='flex items-center justify-center gap-1 mb-1'>
                    <Clock className='w-3 h-3 text-purple-400' />
                    <span className='text-xs text-gray-500 dark:text-gray-400'>Days</span>
                  </div>
                  <p className='text-sm font-bold text-purple-400'>{asset.days_since_ath}d</p>
                </div>
              </div>

              {/* Insights */}
              {asset.insights && asset.insights.length > 0 && (
                <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50'>
                  {asset.insights.slice(0, 2).map(insight => (
                    <p
                      key={insight.message}
                      className='text-xs text-gray-500 dark:text-gray-400 mb-1'
                    >
                      {insight.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ATHAnalysis
