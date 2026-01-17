/**
 * Correlation Matrix Component
 *
 * Displays asset correlation analysis with visual matrix
 * and diversification insights.
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  GitBranch,
  AlertTriangle,
  Info,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Shield,
} from 'lucide-react'
import { CorrelationResult } from '@/services/aiService'
import { CryptoIcon } from '@/components/CryptoIcon'

interface CorrelationMatrixProps {
  data: CorrelationResult | null
  loading?: boolean
  error?: string | null
}

const getCorrelationColor = (value: number): string => {
  if (value >= 0.8) return 'bg-gradient-to-br from-red-500 to-rose-600'
  if (value >= 0.6) return 'bg-gradient-to-br from-orange-500 to-amber-600'
  if (value >= 0.4) return 'bg-gradient-to-br from-yellow-500 to-amber-500'
  if (value >= 0.2) return 'bg-gradient-to-br from-green-400 to-emerald-500'
  if (value >= 0) return 'bg-gradient-to-br from-green-500 to-teal-600'
  if (value >= -0.2) return 'bg-gradient-to-br from-blue-400 to-cyan-500'
  if (value >= -0.4) return 'bg-gradient-to-br from-blue-500 to-indigo-600'
  return 'bg-gradient-to-br from-purple-500 to-violet-600'
}

const getCorrelationTextColor = (value: number): string => {
  if (value >= 0.7) return 'text-red-400'
  if (value >= 0.4) return 'text-yellow-400'
  return 'text-green-400'
}

// Helper function for severity styling
const getSeverityStyle = (severity: string) => {
  if (severity === 'high') {
    return {
      bg: 'bg-gradient-to-r from-red-500/10 to-rose-500/10',
      border: 'border-red-500/30',
      iconColor: 'text-red-400',
    }
  }
  if (severity === 'medium') {
    return {
      bg: 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10',
      border: 'border-yellow-500/30',
      iconColor: 'text-yellow-400',
    }
  }
  return {
    bg: 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  }
}

const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({ data, loading, error }) => {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center p-12 space-y-4 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='relative'>
          <div className='absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse' />
          <div className='relative p-4 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-full'>
            <GitBranch className='w-10 h-10 text-purple-500' />
          </div>
        </div>
        <Loader2 className='w-6 h-6 text-purple-500 animate-spin' />
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          {t('aiIntelligence.portfolio.analyzing')}
        </p>
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

  if (!data || data.symbols.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center p-8 sm:p-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900/80 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-3 sm:mb-4'>
          <GitBranch className='w-8 h-8 sm:w-12 sm:h-12 opacity-50' />
        </div>
        <p className='text-xs sm:text-sm font-medium'>{t('aiIntelligence.errors.noData')}</p>
        <p className='text-[10px] sm:text-xs mt-1 opacity-70'>
          {t('aiIntelligence.errors.insufficientData')}
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-3 sm:space-y-5'>
      {/* Premium Header */}
      <div className='flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-900/80 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='flex items-center gap-2 sm:gap-3'>
          <div className='p-2 sm:p-2.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-lg sm:rounded-xl'>
            <GitBranch className='w-4 h-4 sm:w-5 sm:h-5 text-purple-500' />
          </div>
          <div>
            <h3 className='text-sm sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1.5 sm:gap-2'>
              {t('aiIntelligence.correlation.title')}
              <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-yellow-500' />
            </h3>
            <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400'>
              {t('aiIntelligence.correlation.subtitle')}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <div className='px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-500/10 rounded-lg sm:rounded-xl'>
            <span className='text-[10px] sm:text-xs font-semibold text-purple-500'>
              {data.lookback_days} dias • {data.data_points} pts
            </span>
          </div>
        </div>
      </div>

      {/* Matrix with Premium Styling */}
      <div className='overflow-x-auto bg-white dark:bg-gray-900/80 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700/50 p-2 sm:p-4'>
        <div className='inline-block min-w-full'>
          <table className='w-full border-collapse'>
            <thead>
              <tr>
                <th className='p-1 sm:p-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 text-left'></th>
                {data.symbols.map(symbol => (
                  <th
                    key={symbol}
                    className='p-1 sm:p-2 text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 text-center'
                  >
                    <div className='flex flex-col items-center gap-0.5 sm:gap-1'>
                      <CryptoIcon symbol={symbol} size={16} />
                      <span className='font-semibold text-[9px] sm:text-xs'>{symbol}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.symbols.map(rowSymbol => (
                <tr key={rowSymbol}>
                  <td className='p-1 sm:p-2 text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300'>
                    <div className='flex items-center gap-1 sm:gap-2'>
                      <CryptoIcon symbol={rowSymbol} size={14} />
                      <span className='font-semibold text-[9px] sm:text-xs'>{rowSymbol}</span>
                    </div>
                  </td>
                  {data.symbols.map(colSymbol => {
                    const value = data.matrix[rowSymbol]?.[colSymbol] ?? 0
                    const isMainDiagonal = rowSymbol === colSymbol

                    return (
                      <td key={`${rowSymbol}-${colSymbol}`} className='p-0.5 sm:p-1'>
                        <div
                          className={`
                            w-9 h-9 sm:w-14 sm:h-14 flex items-center justify-center rounded-lg sm:rounded-xl shadow-sm
                            ${isMainDiagonal ? 'bg-gray-200 dark:bg-gray-700' : getCorrelationColor(value)}
                            ${isMainDiagonal ? 'opacity-50' : 'opacity-90'}
                            transition-all duration-200 hover:opacity-100 hover:scale-110 hover:shadow-lg cursor-pointer
                          `}
                          title={`${rowSymbol} - ${colSymbol}: ${(value * 100).toFixed(0)}%`}
                        >
                          <span
                            className={`text-[10px] sm:text-sm font-bold ${
                              isMainDiagonal
                                ? 'text-gray-500 dark:text-gray-400'
                                : 'text-white drop-shadow-sm'
                            }`}
                          >
                            {(value * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Legend */}
      <div className='flex flex-wrap items-center justify-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-gray-900/80 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='flex items-center gap-1.5 sm:gap-2 group'>
          <div className='w-3 h-3 sm:w-4 sm:h-4 rounded-md sm:rounded-lg bg-gradient-to-br from-red-500 to-rose-600 shadow-sm group-hover:scale-110 transition-transform' />
          <span className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium'>
            Alta (80%+)
          </span>
        </div>
        <div className='flex items-center gap-1.5 sm:gap-2 group'>
          <div className='w-3 h-3 sm:w-4 sm:h-4 rounded-md sm:rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 shadow-sm group-hover:scale-110 transition-transform' />
          <span className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium'>
            Média (40-60%)
          </span>
        </div>
        <div className='flex items-center gap-1.5 sm:gap-2 group'>
          <div className='w-3 h-3 sm:w-4 sm:h-4 rounded-md sm:rounded-lg bg-gradient-to-br from-green-500 to-teal-600 shadow-sm group-hover:scale-110 transition-transform' />
          <span className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium'>
            Baixa (0-20%)
          </span>
        </div>
        <div className='flex items-center gap-1.5 sm:gap-2 group'>
          <div className='w-3 h-3 sm:w-4 sm:h-4 rounded-md sm:rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm group-hover:scale-110 transition-transform' />
          <span className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium'>
            Negativa
          </span>
        </div>
      </div>

      {/* High Correlations Warning */}
      {data.high_correlations.length > 0 && (
        <div className='p-3 sm:p-5 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl sm:rounded-2xl'>
          <div className='flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3'>
            <div className='p-1.5 sm:p-2 bg-orange-500/20 rounded-lg sm:rounded-xl'>
              <AlertTriangle className='w-4 h-4 sm:w-5 sm:h-5 text-orange-500' />
            </div>
            <div>
              <span className='text-xs sm:text-sm font-bold text-orange-500'>
                Alta Correlação Detectada
              </span>
              <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400'>
                Ativos se movem juntos, reduzindo diversificação
              </p>
            </div>
          </div>
          <ul className='space-y-1.5 sm:space-y-2'>
            {data.high_correlations.slice(0, 3).map(item => (
              <li
                key={`high-${item.pair[0]}-${item.pair[1]}`}
                className='flex items-center justify-between p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl'
              >
                <div className='flex items-center gap-1.5 sm:gap-2'>
                  <TrendingUp className='w-3 h-3 sm:w-4 sm:h-4 text-orange-400' />
                  <span className='text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200'>
                    {item.pair[0]} ↔ {item.pair[1]}
                  </span>
                </div>
                <span
                  className={`text-xs sm:text-sm font-bold ${getCorrelationTextColor(item.correlation)}`}
                >
                  {(item.correlation * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Low Correlations (Good) */}
      {data.low_correlations.length > 0 && (
        <div className='p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl'>
          <div className='flex items-center gap-3 mb-3'>
            <div className='p-2 bg-green-500/20 rounded-xl'>
              <Shield className='w-5 h-5 text-green-500' />
            </div>
            <div>
              <span className='text-sm font-bold text-green-500'>Boa Diversificação</span>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                Baixa correlação reduz volatilidade do portfólio
              </p>
            </div>
          </div>
          <ul className='space-y-2'>
            {data.low_correlations.slice(0, 3).map(item => (
              <li
                key={`low-${item.pair[0]}-${item.pair[1]}`}
                className='flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl'
              >
                <div className='flex items-center gap-2'>
                  <TrendingDown className='w-4 h-4 text-green-400' />
                  <span className='text-sm font-medium text-gray-700 dark:text-gray-200'>
                    {item.pair[0]} ↔ {item.pair[1]}
                  </span>
                </div>
                <span className='text-sm font-bold text-green-400'>
                  {(item.correlation * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Insights */}
      {data.insights && data.insights.length > 0 && (
        <div className='space-y-3'>
          {data.insights.slice(0, 3).map(insight => {
            const style = getSeverityStyle(insight.severity)
            return (
              <div
                key={insight.title}
                className={`p-4 rounded-2xl border ${style.bg} ${style.border}`}
              >
                <div className='flex items-start gap-3'>
                  <div className={`p-1.5 ${style.bg} rounded-lg`}>
                    <Info className={`w-4 h-4 ${style.iconColor}`} />
                  </div>
                  <div>
                    <p className='text-sm font-bold text-gray-900 dark:text-white'>
                      {insight.title}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                      {insight.message}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CorrelationMatrix
