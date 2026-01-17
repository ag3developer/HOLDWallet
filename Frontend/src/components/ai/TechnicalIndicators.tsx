/**
 * Technical Indicators Component
 *
 * Displays momentum, trend, volatility and volume indicators
 * with visual signals and interpretation.
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertTriangle,
  Loader2,
  Minus,
  Sparkles,
  Gauge,
  LineChart,
  Waves,
} from 'lucide-react'
import { TechnicalIndicators as TechnicalIndicatorsType } from '@/services/aiService'

interface TechnicalIndicatorsProps {
  data: TechnicalIndicatorsType | null
  loading?: boolean
  error?: string | null
  formatCurrency?: (amountUSD: number) => string
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
    return 'bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30'
  }
  if (
    lowerSignal.includes('oversold') ||
    lowerSignal.includes('buy') ||
    lowerSignal.includes('bullish')
  ) {
    return 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30'
  }
  return 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30'
}

// Helper function for RSI indicator color
const getRsiIndicatorColor = (value: number) => {
  if (value > 70) return 'bg-gradient-to-r from-red-500 to-rose-500'
  if (value < 30) return 'bg-gradient-to-r from-green-500 to-emerald-500'
  return 'bg-gradient-to-r from-yellow-500 to-amber-500'
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

const TechnicalIndicators: React.FC<TechnicalIndicatorsProps> = ({
  data,
  loading,
  error,
  formatCurrency,
}) => {
  const { t } = useTranslation()

  // Helper: format price with user currency or fallback
  const formatPrice = (value: number) => {
    if (formatCurrency) {
      return formatCurrency(value)
    }
    return `$${value.toFixed(0)}`
  }

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center p-12 space-y-4 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='relative'>
          <div className='absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse' />
          <div className='relative p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full'>
            <Activity className='w-10 h-10 text-cyan-500' />
          </div>
        </div>
        <Loader2 className='w-6 h-6 text-cyan-500 animate-spin' />
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

  if (!data) {
    return (
      <div className='flex flex-col items-center justify-center p-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4'>
          <Activity className='w-12 h-12 opacity-50' />
        </div>
        <p className='text-sm font-medium'>{t('aiIntelligence.errors.noData')}</p>
      </div>
    )
  }

  const { indicators, symbol } = data

  return (
    <div className='space-y-3 sm:space-y-5'>
      {/* Premium Header */}
      <div className='flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-900/80 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700/50'>
        <div className='flex items-center gap-2 sm:gap-3'>
          <div className='p-2 sm:p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg sm:rounded-xl'>
            <Activity className='w-4 h-4 sm:w-5 sm:h-5 text-cyan-500' />
          </div>
          <div>
            <h3 className='text-sm sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1.5 sm:gap-2'>
              {t('aiIntelligence.indicators.title')}
              <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-yellow-500' />
            </h3>
            <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400'>
              {t('aiIntelligence.indicators.subtitle')}
            </p>
          </div>
        </div>
        <span className='px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-500 rounded-lg sm:rounded-xl border border-cyan-500/30'>
          {symbol}
        </span>
      </div>

      {/* Momentum Section */}
      <div className='space-y-3 sm:space-y-4'>
        <div className='flex items-center gap-2 sm:gap-3 px-1'>
          <div className='p-1.5 sm:p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg sm:rounded-xl'>
            <Gauge className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500' />
          </div>
          <h4 className='text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300'>
            Momentum
          </h4>
        </div>

        {/* RSI */}
        <div
          className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border ${getSignalBg(indicators.momentum.rsi.signal)}`}
        >
          <div className='flex items-center justify-between mb-2 sm:mb-3'>
            <span className='text-xs sm:text-sm font-bold text-gray-900 dark:text-white'>
              RSI (14)
            </span>
            <div className='flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/50 dark:bg-gray-800/50'>
              <SignalIcon signal={indicators.momentum.rsi.signal} />
              <span
                className={`text-[10px] sm:text-xs font-semibold ${getSignalColor(indicators.momentum.rsi.signal)}`}
              >
                {indicators.momentum.rsi.signal}
              </span>
            </div>
          </div>
          <div className='flex items-center gap-3 sm:gap-4'>
            <span className='text-xl sm:text-3xl font-bold text-gray-900 dark:text-white'>
              {indicators.momentum.rsi.value.toFixed(1)}
            </span>
            <div className='flex-1'>
              <div className='h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative'>
                {/* Zone markers */}
                <div className='absolute left-[30%] top-0 bottom-0 w-0.5 bg-green-500/50' />
                <div className='absolute left-[70%] top-0 bottom-0 w-0.5 bg-red-500/50' />
                {/* RSI indicator */}
                <div
                  className={`absolute top-0 bottom-0 w-2 sm:w-3 rounded-full transform -translate-x-1/2 shadow-lg ${getRsiIndicatorColor(indicators.momentum.rsi.value)}`}
                  style={{ left: `${Math.min(Math.max(indicators.momentum.rsi.value, 0), 100)}%` }}
                />
              </div>
              <div className='flex justify-between mt-1 sm:mt-2 text-[9px] sm:text-xs text-gray-500 font-medium'>
                <span>0</span>
                <span className='text-green-500'>30</span>
                <span className='text-red-500'>70</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stochastic */}
        <div
          className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border ${getSignalBg(indicators.momentum.stochastic.signal)}`}
        >
          <div className='flex items-center justify-between mb-2 sm:mb-3'>
            <span className='text-xs sm:text-sm font-bold text-gray-900 dark:text-white'>
              Stochastic
            </span>
            <div className='flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/50 dark:bg-gray-800/50'>
              <SignalIcon signal={indicators.momentum.stochastic.signal} />
              <span
                className={`text-[10px] sm:text-xs font-semibold ${getSignalColor(indicators.momentum.stochastic.signal)}`}
              >
                {indicators.momentum.stochastic.signal}
              </span>
            </div>
          </div>
          <div className='grid grid-cols-2 gap-2 sm:gap-4'>
            <div className='text-center p-2 sm:p-3 bg-white dark:bg-gray-800/50 rounded-lg sm:rounded-xl'>
              <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                %K
              </p>
              <p className='text-base sm:text-2xl font-bold text-purple-500'>
                {indicators.momentum.stochastic.k.toFixed(1)}
              </p>
            </div>
            <div className='text-center p-2 sm:p-3 bg-white dark:bg-gray-800/50 rounded-lg sm:rounded-xl'>
              <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                %D
              </p>
              <p className='text-base sm:text-2xl font-bold text-pink-500'>
                {indicators.momentum.stochastic.d.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Section */}
      <div className='space-y-3 sm:space-y-4'>
        <div className='flex items-center gap-2 sm:gap-3 px-1'>
          <div className='p-1.5 sm:p-2 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg sm:rounded-xl'>
            <LineChart className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500' />
          </div>
          <h4 className='text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300'>Trend</h4>
        </div>

        {/* Moving Averages */}
        <div className='p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900/80'>
          <span className='text-xs sm:text-sm font-bold text-gray-900 dark:text-white'>
            Moving Averages
          </span>
          <div className='grid grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4'>
            {indicators.trend.sma.sma_20 !== null && (
              <div className='text-center p-2 sm:p-3 bg-blue-500/10 rounded-lg sm:rounded-xl border border-blue-500/20'>
                <p className='text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                  SMA 20
                </p>
                <p className='text-xs sm:text-lg font-bold text-blue-500'>
                  {formatPrice(indicators.trend.sma.sma_20)}
                </p>
              </div>
            )}
            {indicators.trend.sma.sma_50 !== null && (
              <div className='text-center p-2 sm:p-3 bg-purple-500/10 rounded-lg sm:rounded-xl border border-purple-500/20'>
                <p className='text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                  SMA 50
                </p>
                <p className='text-xs sm:text-lg font-bold text-purple-500'>
                  {formatPrice(indicators.trend.sma.sma_50)}
                </p>
              </div>
            )}
            {indicators.trend.sma.sma_200 !== null && (
              <div className='text-center p-2 sm:p-3 bg-orange-500/10 rounded-lg sm:rounded-xl border border-orange-500/20'>
                <p className='text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                  SMA 200
                </p>
                <p className='text-xs sm:text-lg font-bold text-orange-500'>
                  {formatPrice(indicators.trend.sma.sma_200)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MACD */}
        <div
          className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border ${getSignalBg(indicators.trend.macd.trend)}`}
        >
          <div className='flex items-center justify-between mb-2 sm:mb-3'>
            <span className='text-xs sm:text-sm font-bold text-gray-900 dark:text-white'>MACD</span>
            <div className='flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/50 dark:bg-gray-800/50'>
              <SignalIcon signal={indicators.trend.macd.trend} />
              <span
                className={`text-[10px] sm:text-xs font-semibold ${getSignalColor(indicators.trend.macd.trend)}`}
              >
                {indicators.trend.macd.trend}
              </span>
            </div>
          </div>
          <div className='grid grid-cols-3 gap-2 sm:gap-3'>
            <div className='text-center p-2 sm:p-3 bg-white dark:bg-gray-800/50 rounded-lg sm:rounded-xl'>
              <p className='text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                MACD
              </p>
              <p
                className={`text-xs sm:text-lg font-bold ${indicators.trend.macd.macd >= 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {indicators.trend.macd.macd.toFixed(2)}
              </p>
            </div>
            <div className='text-center p-2 sm:p-3 bg-white dark:bg-gray-800/50 rounded-lg sm:rounded-xl'>
              <p className='text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                Signal
              </p>
              <p className='text-xs sm:text-lg font-bold text-yellow-500'>
                {indicators.trend.macd.signal.toFixed(2)}
              </p>
            </div>
            <div className='text-center p-2 sm:p-3 bg-white dark:bg-gray-800/50 rounded-lg sm:rounded-xl'>
              <p className='text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                Histogram
              </p>
              <p
                className={`text-xs sm:text-lg font-bold ${indicators.trend.macd.histogram >= 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {indicators.trend.macd.histogram.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Volatility Section */}
      <div className='space-y-3 sm:space-y-4'>
        <div className='flex items-center gap-2 sm:gap-3 px-1'>
          <div className='p-1.5 sm:p-2 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg sm:rounded-xl'>
            <Waves className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500' />
          </div>
          <h4 className='text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300'>
            Volatility
          </h4>
        </div>

        {/* Bollinger Bands */}
        <div
          className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border ${getSignalBg(indicators.volatility.bollinger.signal)}`}
        >
          <div className='flex items-center justify-between mb-2 sm:mb-3'>
            <span className='text-xs sm:text-sm font-bold text-gray-900 dark:text-white'>
              Bollinger Bands
            </span>
            <div className='flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/50 dark:bg-gray-800/50'>
              <SignalIcon signal={indicators.volatility.bollinger.signal} />
              <span
                className={`text-[10px] sm:text-xs font-semibold ${getSignalColor(indicators.volatility.bollinger.signal)}`}
              >
                {indicators.volatility.bollinger.signal}
              </span>
            </div>
          </div>
          <div className='grid grid-cols-4 gap-1.5 sm:gap-3'>
            <div className='text-center p-1.5 sm:p-3 bg-red-500/10 rounded-lg sm:rounded-xl border border-red-500/20'>
              <p className='text-[8px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                Upper
              </p>
              <p className='text-[11px] sm:text-lg font-bold text-red-500'>
                {formatPrice(indicators.volatility.bollinger.upper)}
              </p>
            </div>
            <div className='text-center p-1.5 sm:p-3 bg-yellow-500/10 rounded-lg sm:rounded-xl border border-yellow-500/20'>
              <p className='text-[8px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                Middle
              </p>
              <p className='text-[11px] sm:text-lg font-bold text-yellow-500'>
                {formatPrice(indicators.volatility.bollinger.middle)}
              </p>
            </div>
            <div className='text-center p-1.5 sm:p-3 bg-green-500/10 rounded-lg sm:rounded-xl border border-green-500/20'>
              <p className='text-[8px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                Lower
              </p>
              <p className='text-[11px] sm:text-lg font-bold text-green-500'>
                {formatPrice(indicators.volatility.bollinger.lower)}
              </p>
            </div>
            <div className='text-center p-1.5 sm:p-3 bg-white dark:bg-gray-800/50 rounded-lg sm:rounded-xl'>
              <p className='text-[8px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                Position
              </p>
              <p className='text-[11px] sm:text-lg font-bold text-gray-900 dark:text-white'>
                {(indicators.volatility.bollinger.position * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        {/* ATR */}
        <div className='p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900/80'>
          <span className='text-xs sm:text-sm font-bold text-gray-900 dark:text-white'>
            ATR (14)
          </span>
          <div className='grid grid-cols-2 gap-2 sm:gap-4 mt-3 sm:mt-4'>
            <div className='text-center p-2 sm:p-4 bg-orange-500/10 rounded-lg sm:rounded-xl border border-orange-500/20'>
              <p className='text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                Value
              </p>
              <p className='text-base sm:text-2xl font-bold text-orange-500'>
                {formatPrice(indicators.volatility.atr.value)}
              </p>
            </div>
            <div className='text-center p-2 sm:p-4 bg-cyan-500/10 rounded-lg sm:rounded-xl border border-cyan-500/20'>
              <p className='text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1'>
                % of Price
              </p>
              <p className='text-base sm:text-2xl font-bold text-cyan-500'>
                {indicators.volatility.atr.percent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Volume Section */}
      <div className='space-y-3 sm:space-y-4'>
        <div className='flex items-center gap-2 sm:gap-3 px-1'>
          <div className='p-1.5 sm:p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg sm:rounded-xl'>
            <BarChart3 className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500' />
          </div>
          <h4 className='text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300'>Volume</h4>
        </div>

        <div
          className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border ${getSignalBg(indicators.volume.obv.trend)}`}
        >
          <div className='flex items-center justify-between mb-2 sm:mb-3'>
            <span className='text-xs sm:text-sm font-bold text-gray-900 dark:text-white'>OBV</span>
            <div className='flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/50 dark:bg-gray-800/50'>
              <SignalIcon signal={indicators.volume.obv.trend} />
              <span
                className={`text-[10px] sm:text-xs font-semibold ${getSignalColor(indicators.volume.obv.trend)}`}
              >
                {indicators.volume.obv.trend}
              </span>
            </div>
          </div>
          <p className='text-xl sm:text-3xl font-bold text-gray-900 dark:text-white'>
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
