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
} from 'lucide-react'
import { ATHAnalysis as ATHAnalysisType } from '@/services/aiService'

interface ATHAnalysisProps {
  data: ATHAnalysisType[] | null
  loading?: boolean
  error?: string | null
}

// Zone color mapping
const getZoneStyle = (zone: string) => {
  switch (zone) {
    case 'ATH_ZONE':
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        label: 'ATH Zone',
      }
    case 'STRONG':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        label: 'Strong',
      }
    case 'RECOVERING':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        label: 'Recovering',
      }
    case 'WEAK':
      return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        label: 'Weak',
      }
    case 'CAPITULATION':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        label: 'Capitulation',
      }
    default:
      return {
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/30',
        text: 'text-gray-400',
        label: 'Unknown',
      }
  }
}

const formatNumber = (num: number, decimals: number = 2) => {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`
  return `$${num.toFixed(decimals)}`
}

const ATHAnalysis: React.FC<ATHAnalysisProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center p-8 space-y-4'>
        <Loader2 className='w-8 h-8 text-blue-500 animate-spin' />
        <p className='text-sm text-gray-500 dark:text-gray-400'>Analyzing ATH data...</p>
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

  if (!data || data.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400'>
        <Target className='w-12 h-12 mb-3 opacity-50' />
        <p className='text-sm'>No ATH data available</p>
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
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <Target className='w-5 h-5 text-blue-400' />
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>ATH Analysis</h3>
        </div>
        <span className='text-xs text-gray-500 dark:text-gray-400'>{data.length} assets</span>
      </div>

      {/* Asset Cards */}
      <div className='space-y-3'>
        {sortedData.map(asset => {
          const zoneStyle = getZoneStyle(asset.zone)

          return (
            <div
              key={asset.symbol}
              className={`p-4 rounded-xl border ${zoneStyle.border} ${zoneStyle.bg} transition-all hover:scale-[1.01]`}
            >
              {/* Top row: Symbol, Zone, ATH status */}
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-3'>
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
                    {formatNumber(asset.current_price)}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>ATH Price</p>
                  <p className='text-base font-semibold text-gray-600 dark:text-gray-300'>
                    {formatNumber(asset.ath_price)}
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
                    className={`h-full rounded-full transition-all duration-500 ${
                      asset.zone === 'ATH_ZONE'
                        ? 'bg-gradient-to-r from-green-500 to-green-400'
                        : asset.zone === 'STRONG'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                          : asset.zone === 'RECOVERING'
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                            : asset.zone === 'WEAK'
                              ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                              : 'bg-gradient-to-r from-red-500 to-red-400'
                    }`}
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
                  <p
                    className={`text-sm font-bold ${
                      asset.distance_from_ath_percent > 20
                        ? 'text-red-400'
                        : asset.distance_from_ath_percent > 10
                          ? 'text-yellow-400'
                          : 'text-green-400'
                    }`}
                  >
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
                  {asset.insights.slice(0, 2).map((insight, idx) => (
                    <p key={idx} className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
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
