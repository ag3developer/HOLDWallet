/**
 * Correlation Matrix Component
 *
 * Displays asset correlation analysis with visual matrix
 * and diversification insights.
 */

import React from 'react'
import { GitBranch, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react'
import { CorrelationResult } from '@/services/aiService'
import { CryptoIcon } from '@/components/CryptoIcon'

interface CorrelationMatrixProps {
  data: CorrelationResult | null
  loading?: boolean
  error?: string | null
}

const getCorrelationColor = (value: number): string => {
  if (value >= 0.8) return 'bg-red-500'
  if (value >= 0.6) return 'bg-orange-500'
  if (value >= 0.4) return 'bg-yellow-500'
  if (value >= 0.2) return 'bg-green-400'
  if (value >= 0) return 'bg-green-500'
  if (value >= -0.2) return 'bg-blue-400'
  if (value >= -0.4) return 'bg-blue-500'
  return 'bg-purple-500'
}

const getCorrelationTextColor = (value: number): string => {
  if (value >= 0.7) return 'text-red-400'
  if (value >= 0.4) return 'text-yellow-400'
  return 'text-green-400'
}

const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center p-8 space-y-4'>
        <Loader2 className='w-8 h-8 text-blue-500 animate-spin' />
        <p className='text-sm text-gray-500 dark:text-gray-400'>Calculating correlations...</p>
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

  if (!data || data.symbols.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400'>
        <GitBranch className='w-12 h-12 mb-3 opacity-50' />
        <p className='text-sm'>No correlation data available</p>
        <p className='text-xs mt-1'>Add more assets to analyze diversification</p>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <GitBranch className='w-5 h-5 text-purple-400' />
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Correlation Analysis
          </h3>
        </div>
        <span className='text-xs text-gray-500 dark:text-gray-400'>
          {data.lookback_days} days, {data.data_points} data points
        </span>
      </div>

      {/* Matrix */}
      <div className='overflow-x-auto'>
        <div className='inline-block min-w-full'>
          <table className='w-full border-collapse'>
            <thead>
              <tr>
                <th className='p-2 text-xs text-gray-500 dark:text-gray-400 text-left'></th>
                {data.symbols.map(symbol => (
                  <th
                    key={symbol}
                    className='p-2 text-xs font-medium text-gray-600 dark:text-gray-300 text-center'
                  >
                    <div className='flex flex-col items-center gap-1'>
                      <CryptoIcon symbol={symbol} size={20} />
                      <span>{symbol}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.symbols.map(rowSymbol => (
                <tr key={rowSymbol}>
                  <td className='p-2 text-xs font-medium text-gray-600 dark:text-gray-300'>
                    <div className='flex items-center gap-2'>
                      <CryptoIcon symbol={rowSymbol} size={18} />
                      <span>{rowSymbol}</span>
                    </div>
                  </td>
                  {data.symbols.map(colSymbol => {
                    const value = data.matrix[rowSymbol]?.[colSymbol] ?? 0
                    const isMainDiagonal = rowSymbol === colSymbol

                    return (
                      <td key={`${rowSymbol}-${colSymbol}`} className='p-1'>
                        <div
                          className={`
                            w-12 h-12 flex items-center justify-center rounded-lg
                            ${isMainDiagonal ? 'bg-gray-200 dark:bg-gray-700' : getCorrelationColor(value)}
                            ${isMainDiagonal ? 'opacity-50' : 'opacity-80'}
                            transition-all hover:opacity-100 hover:scale-110
                          `}
                          title={`${rowSymbol} - ${colSymbol}: ${(value * 100).toFixed(0)}%`}
                        >
                          <span
                            className={`text-xs font-bold ${
                              isMainDiagonal ? 'text-gray-500 dark:text-gray-400' : 'text-white'
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

      {/* Legend */}
      <div className='flex items-center justify-center gap-4 py-2'>
        <div className='flex items-center gap-2'>
          <div className='w-3 h-3 rounded bg-red-500' />
          <span className='text-xs text-gray-500 dark:text-gray-400'>High (80%+)</span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-3 h-3 rounded bg-yellow-500' />
          <span className='text-xs text-gray-500 dark:text-gray-400'>Medium (40-60%)</span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-3 h-3 rounded bg-green-500' />
          <span className='text-xs text-gray-500 dark:text-gray-400'>Low (0-20%)</span>
        </div>
      </div>

      {/* High Correlations Warning */}
      {data.high_correlations.length > 0 && (
        <div className='p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl'>
          <div className='flex items-center gap-2 mb-2'>
            <AlertTriangle className='w-4 h-4 text-orange-400' />
            <span className='text-sm font-medium text-orange-400'>High Correlation Detected</span>
          </div>
          <ul className='space-y-1'>
            {data.high_correlations.slice(0, 3).map((item, idx) => (
              <li key={`high-${idx}`} className='flex items-center justify-between text-sm'>
                <span className='text-gray-600 dark:text-gray-300'>
                  {item.pair[0]} - {item.pair[1]}
                </span>
                <span className={getCorrelationTextColor(item.correlation)}>
                  {(item.correlation * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
            Highly correlated assets move together, reducing diversification benefit
          </p>
        </div>
      )}

      {/* Low Correlations (Good) */}
      {data.low_correlations.length > 0 && (
        <div className='p-4 bg-green-500/10 border border-green-500/30 rounded-xl'>
          <div className='flex items-center gap-2 mb-2'>
            <CheckCircle className='w-4 h-4 text-green-400' />
            <span className='text-sm font-medium text-green-400'>Good Diversification</span>
          </div>
          <ul className='space-y-1'>
            {data.low_correlations.slice(0, 3).map((item, idx) => (
              <li key={`low-${idx}`} className='flex items-center justify-between text-sm'>
                <span className='text-gray-600 dark:text-gray-300'>
                  {item.pair[0]} - {item.pair[1]}
                </span>
                <span className='text-green-400'>{(item.correlation * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
            Low correlation assets help reduce portfolio volatility
          </p>
        </div>
      )}

      {/* Insights */}
      {data.insights && data.insights.length > 0 && (
        <div className='space-y-2'>
          {data.insights.slice(0, 3).map((insight, idx) => (
            <div
              key={`insight-${idx}`}
              className={`p-3 rounded-lg border ${
                insight.severity === 'high'
                  ? 'bg-red-500/10 border-red-500/30'
                  : insight.severity === 'medium'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              <div className='flex items-start gap-2'>
                <Info
                  className={`w-4 h-4 mt-0.5 ${
                    insight.severity === 'high'
                      ? 'text-red-400'
                      : insight.severity === 'medium'
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                  }`}
                />
                <div>
                  <p className='text-sm font-medium text-gray-900 dark:text-white'>
                    {insight.title}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                    {insight.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CorrelationMatrix
