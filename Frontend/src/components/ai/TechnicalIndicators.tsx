/**
 * Technical Indicators Component
 *
 * Displays momentum, trend, volatility and volume indicators
 * with visual signals and interpretation.
 */

import React from 'react'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertTriangle,
  Loader2,
  Minus,
} from 'lucide-react'
import { TechnicalIndicators as TechnicalIndicatorsType } from '@/services/aiService'

interface TechnicalIndicatorsProps {
  data: TechnicalIndicatorsType | null
  loading?: boolean
  error?: string | null
}

const getSignalColor = (signal: string): string => {
  const lowerSignal = signal.toLowerCase()
  if (
    lowerSignal.includes('overbought') ||
    lowerSignal.includes('sell') ||
    lowerSignal.includes('bearish')
  ) {
    return 'text-red-400'
  }
  if (
    lowerSignal.includes('oversold') ||
    lowerSignal.includes('buy') ||
    lowerSignal.includes('bullish')
  ) {
    return 'text-green-400'
  }
  return 'text-yellow-400'
}

const getSignalBg = (signal: string): string => {
  const lowerSignal = signal.toLowerCase()
  if (
    lowerSignal.includes('overbought') ||
    lowerSignal.includes('sell') ||
    lowerSignal.includes('bearish')
  ) {
    return 'bg-red-500/10 border-red-500/30'
  }
  if (
    lowerSignal.includes('oversold') ||
    lowerSignal.includes('buy') ||
    lowerSignal.includes('bullish')
  ) {
    return 'bg-green-500/10 border-green-500/30'
  }
  return 'bg-yellow-500/10 border-yellow-500/30'
}

const SignalIcon: React.FC<{ signal: string }> = ({ signal }) => {
  const lowerSignal = signal.toLowerCase()
  if (
    lowerSignal.includes('overbought') ||
    lowerSignal.includes('sell') ||
    lowerSignal.includes('bearish')
  ) {
    return <TrendingDown className='w-4 h-4 text-red-400' />
  }
  if (
    lowerSignal.includes('oversold') ||
    lowerSignal.includes('buy') ||
    lowerSignal.includes('bullish')
  ) {
    return <TrendingUp className='w-4 h-4 text-green-400' />
  }
  return <Minus className='w-4 h-4 text-yellow-400' />
}

const TechnicalIndicators: React.FC<TechnicalIndicatorsProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center p-8 space-y-4'>
        <Loader2 className='w-8 h-8 text-blue-500 animate-spin' />
        <p className='text-sm text-gray-500 dark:text-gray-400'>Calculating indicators...</p>
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
        <Activity className='w-12 h-12 mb-3 opacity-50' />
        <p className='text-sm'>No indicator data available</p>
      </div>
    )
  }

  const { indicators, symbol } = data

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <Activity className='w-5 h-5 text-cyan-400' />
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Technical Indicators
          </h3>
        </div>
        <span className='px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full'>
          {symbol}
        </span>
      </div>

      {/* Momentum Section */}
      <div className='space-y-3'>
        <h4 className='text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2'>
          <TrendingUp className='w-4 h-4' />
          Momentum
        </h4>

        {/* RSI */}
        <div className={`p-4 rounded-xl border ${getSignalBg(indicators.momentum.rsi.signal)}`}>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>RSI (14)</span>
            <div className='flex items-center gap-2'>
              <SignalIcon signal={indicators.momentum.rsi.signal} />
              <span
                className={`text-xs font-medium ${getSignalColor(indicators.momentum.rsi.signal)}`}
              >
                {indicators.momentum.rsi.signal}
              </span>
            </div>
          </div>
          <div className='flex items-center gap-4'>
            <span className='text-2xl font-bold text-gray-900 dark:text-white'>
              {indicators.momentum.rsi.value.toFixed(1)}
            </span>
            <div className='flex-1'>
              <div className='h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative'>
                {/* Zone markers */}
                <div className='absolute left-[30%] top-0 bottom-0 w-px bg-green-500/50' />
                <div className='absolute left-[70%] top-0 bottom-0 w-px bg-red-500/50' />
                {/* RSI indicator */}
                <div
                  className={`absolute top-0 bottom-0 w-2 rounded-full transform -translate-x-1/2 ${
                    indicators.momentum.rsi.value > 70
                      ? 'bg-red-500'
                      : indicators.momentum.rsi.value < 30
                        ? 'bg-green-500'
                        : 'bg-yellow-500'
                  }`}
                  style={{ left: `${Math.min(Math.max(indicators.momentum.rsi.value, 0), 100)}%` }}
                />
              </div>
              <div className='flex justify-between mt-1 text-xs text-gray-500'>
                <span>0</span>
                <span>30</span>
                <span>70</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stochastic */}
        <div
          className={`p-4 rounded-xl border ${getSignalBg(indicators.momentum.stochastic.signal)}`}
        >
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>Stochastic</span>
            <div className='flex items-center gap-2'>
              <SignalIcon signal={indicators.momentum.stochastic.signal} />
              <span
                className={`text-xs font-medium ${getSignalColor(indicators.momentum.stochastic.signal)}`}
              >
                {indicators.momentum.stochastic.signal}
              </span>
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>%K</p>
              <p className='text-xl font-bold text-gray-900 dark:text-white'>
                {indicators.momentum.stochastic.k.toFixed(1)}
              </p>
            </div>
            <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>%D</p>
              <p className='text-xl font-bold text-gray-900 dark:text-white'>
                {indicators.momentum.stochastic.d.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Section */}
      <div className='space-y-3'>
        <h4 className='text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2'>
          <BarChart3 className='w-4 h-4' />
          Trend
        </h4>

        {/* Moving Averages */}
        <div className='p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30'>
          <span className='text-sm font-medium text-gray-900 dark:text-white'>Moving Averages</span>
          <div className='grid grid-cols-3 gap-2 mt-3'>
            {indicators.trend.sma.sma_20 !== null && (
              <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
                <p className='text-xs text-gray-500 dark:text-gray-400'>SMA 20</p>
                <p className='text-sm font-bold text-blue-400'>
                  ${indicators.trend.sma.sma_20.toFixed(0)}
                </p>
              </div>
            )}
            {indicators.trend.sma.sma_50 !== null && (
              <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
                <p className='text-xs text-gray-500 dark:text-gray-400'>SMA 50</p>
                <p className='text-sm font-bold text-purple-400'>
                  ${indicators.trend.sma.sma_50.toFixed(0)}
                </p>
              </div>
            )}
            {indicators.trend.sma.sma_200 !== null && (
              <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
                <p className='text-xs text-gray-500 dark:text-gray-400'>SMA 200</p>
                <p className='text-sm font-bold text-orange-400'>
                  ${indicators.trend.sma.sma_200.toFixed(0)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MACD */}
        <div className={`p-4 rounded-xl border ${getSignalBg(indicators.trend.macd.trend)}`}>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>MACD</span>
            <div className='flex items-center gap-2'>
              <SignalIcon signal={indicators.trend.macd.trend} />
              <span
                className={`text-xs font-medium ${getSignalColor(indicators.trend.macd.trend)}`}
              >
                {indicators.trend.macd.trend}
              </span>
            </div>
          </div>
          <div className='grid grid-cols-3 gap-2'>
            <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>MACD</p>
              <p
                className={`text-sm font-bold ${indicators.trend.macd.macd >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {indicators.trend.macd.macd.toFixed(2)}
              </p>
            </div>
            <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Signal</p>
              <p className='text-sm font-bold text-yellow-400'>
                {indicators.trend.macd.signal.toFixed(2)}
              </p>
            </div>
            <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Histogram</p>
              <p
                className={`text-sm font-bold ${indicators.trend.macd.histogram >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {indicators.trend.macd.histogram.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Volatility Section */}
      <div className='space-y-3'>
        <h4 className='text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2'>
          <Activity className='w-4 h-4' />
          Volatility
        </h4>

        {/* Bollinger Bands */}
        <div
          className={`p-4 rounded-xl border ${getSignalBg(indicators.volatility.bollinger.signal)}`}
        >
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>
              Bollinger Bands
            </span>
            <div className='flex items-center gap-2'>
              <SignalIcon signal={indicators.volatility.bollinger.signal} />
              <span
                className={`text-xs font-medium ${getSignalColor(indicators.volatility.bollinger.signal)}`}
              >
                {indicators.volatility.bollinger.signal}
              </span>
            </div>
          </div>
          <div className='grid grid-cols-4 gap-2'>
            <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Upper</p>
              <p className='text-sm font-bold text-red-400'>
                ${indicators.volatility.bollinger.upper.toFixed(0)}
              </p>
            </div>
            <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Middle</p>
              <p className='text-sm font-bold text-yellow-400'>
                ${indicators.volatility.bollinger.middle.toFixed(0)}
              </p>
            </div>
            <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Lower</p>
              <p className='text-sm font-bold text-green-400'>
                ${indicators.volatility.bollinger.lower.toFixed(0)}
              </p>
            </div>
            <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Position</p>
              <p className='text-sm font-bold text-gray-900 dark:text-white'>
                {(indicators.volatility.bollinger.position * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        {/* ATR */}
        <div className='p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30'>
          <span className='text-sm font-medium text-gray-900 dark:text-white'>ATR (14)</span>
          <div className='grid grid-cols-2 gap-4 mt-3'>
            <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Value</p>
              <p className='text-xl font-bold text-gray-900 dark:text-white'>
                ${indicators.volatility.atr.value.toFixed(2)}
              </p>
            </div>
            <div className='text-center p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>% of Price</p>
              <p className='text-xl font-bold text-cyan-400'>
                {indicators.volatility.atr.percent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Volume Section */}
      <div className='space-y-3'>
        <h4 className='text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2'>
          <BarChart3 className='w-4 h-4' />
          Volume
        </h4>

        <div className={`p-4 rounded-xl border ${getSignalBg(indicators.volume.obv.trend)}`}>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>OBV</span>
            <div className='flex items-center gap-2'>
              <SignalIcon signal={indicators.volume.obv.trend} />
              <span
                className={`text-xs font-medium ${getSignalColor(indicators.volume.obv.trend)}`}
              >
                {indicators.volume.obv.trend}
              </span>
            </div>
          </div>
          <p className='text-2xl font-bold text-gray-900 dark:text-white'>
            {indicators.volume.obv.value >= 1e9
              ? `${(indicators.volume.obv.value / 1e9).toFixed(2)}B`
              : indicators.volume.obv.value >= 1e6
                ? `${(indicators.volume.obv.value / 1e6).toFixed(2)}M`
                : indicators.volume.obv.value.toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default TechnicalIndicators
