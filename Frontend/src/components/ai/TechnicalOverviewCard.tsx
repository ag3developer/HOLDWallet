/**
 * TechnicalOverviewCard - Shows comprehensive technical analysis from TrayOps API
 * Displays RSI, MACD, Support/Resistance, and overall trading signal
 * Uses REAL DATA from /api/technical-analysis/overview
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Minus,
  BarChart3,
  Layers,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Circle,
  Clock,
  ChevronUp,
  ChevronDown,
  Volume2,
  Zap,
} from 'lucide-react'
import { TechnicalAnalysisOverview } from '@/services/trayopsService'
import { CryptoIcon } from '@/components/CryptoIcon'

interface TechnicalOverviewCardProps {
  analysis: TechnicalAnalysisOverview | null
  loading?: boolean
  error?: string | null
}

export const TechnicalOverviewCard: React.FC<TechnicalOverviewCardProps> = ({
  analysis,
  loading = false,
  error = null,
}) => {
  const { t } = useTranslation()

  // Get signal info based on recommendation action
  const getSignalInfo = (action: string | undefined) => {
    const normalizedAction = (action || 'neutral').toUpperCase()

    switch (normalizedAction) {
      case 'STRONG_BUY':
        return {
          label: t('aiIntelligence.setup.strongBuy', 'STRONG BUY'),
          color: 'text-green-600',
          bgColor: 'bg-green-500/10 dark:bg-green-500/20',
          borderColor: 'border-green-500/30',
          icon: TrendingUp,
          gradient: 'from-green-500 to-emerald-600',
        }
      case 'BUY':
        return {
          label: t('aiIntelligence.setup.buy', 'BUY'),
          color: 'text-green-500',
          bgColor: 'bg-green-500/10 dark:bg-green-500/20',
          borderColor: 'border-green-500/30',
          icon: ArrowUp,
          gradient: 'from-green-400 to-emerald-500',
        }
      case 'HOLD':
      case 'NEUTRAL':
        return {
          label: t('aiIntelligence.setup.hold', 'HOLD'),
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10 dark:bg-gray-500/20',
          borderColor: 'border-gray-500/30',
          icon: Minus,
          gradient: 'from-gray-500 to-slate-600',
        }
      case 'SELL':
        return {
          label: t('aiIntelligence.setup.sell', 'SELL'),
          color: 'text-red-500',
          bgColor: 'bg-red-500/10 dark:bg-red-500/20',
          borderColor: 'border-red-500/30',
          icon: ArrowDown,
          gradient: 'from-red-400 to-rose-500',
        }
      case 'STRONG_SELL':
        return {
          label: t('aiIntelligence.setup.strongSell', 'STRONG SELL'),
          color: 'text-red-600',
          bgColor: 'bg-red-500/10 dark:bg-red-500/20',
          borderColor: 'border-red-500/30',
          icon: TrendingDown,
          gradient: 'from-red-500 to-rose-600',
        }
      default:
        return {
          label: normalizedAction,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/30',
          icon: Circle,
          gradient: 'from-gray-500 to-slate-600',
        }
    }
  }

  // Get RSI color
  const getRsiColor = (value: number) => {
    if (value >= 70) return 'text-red-500'
    if (value <= 30) return 'text-green-500'
    return 'text-gray-600 dark:text-gray-400'
  }

  // Translate RSI signal
  const translateRsiSignal = (signal: string | undefined) => {
    const normalizedSignal = (signal || 'NEUTRAL').toUpperCase()
    switch (normalizedSignal) {
      case 'OVERSOLD':
        return t('aiIntelligence.indicators.rsi.oversold', 'Oversold')
      case 'OVERBOUGHT':
        return t('aiIntelligence.indicators.rsi.overbought', 'Overbought')
      default:
        return t('aiIntelligence.indicators.rsi.neutral', 'Neutral')
    }
  }

  // Translate MACD trend
  const translateMacdTrend = (trend: string | undefined) => {
    const normalizedTrend = (trend || 'NEUTRAL').toUpperCase()
    switch (normalizedTrend) {
      case 'BULLISH':
        return t('aiIntelligence.indicators.macd.bullish', 'Bullish')
      case 'BEARISH':
        return t('aiIntelligence.indicators.macd.bearish', 'Bearish')
      default:
        return t('aiIntelligence.sentiment.neutral', 'Neutral')
    }
  }

  // Translate trend strength
  const translateTrendStrength = (strength: string | undefined) => {
    const normalizedStrength = (strength || 'WEAK').toUpperCase()
    switch (normalizedStrength) {
      case 'VERY_STRONG':
        return t('aiIntelligence.indicators.strength.veryStrong', 'Very Strong')
      case 'STRONG':
        return t('aiIntelligence.indicators.strength.strong', 'Strong')
      case 'MODERATE':
        return t('aiIntelligence.indicators.strength.moderate', 'Moderate')
      case 'WEAK':
        return t('aiIntelligence.indicators.strength.weak', 'Weak')
      default:
        return strength || 'N/A'
    }
  }

  // Translate volume signal
  const translateVolumeSignal = (signal: string | undefined) => {
    const normalizedSignal = (signal || 'NORMAL').toUpperCase()
    switch (normalizedSignal) {
      case 'HIGH_VOLUME':
      case 'HIGH':
        return t('aiIntelligence.indicators.volume.high', 'High')
      case 'LOW_VOLUME':
      case 'LOW':
        return t('aiIntelligence.indicators.volume.low', 'Low')
      default:
        return t('aiIntelligence.indicators.volume.average', 'Average')
    }
  }

  // Translate moving averages trend
  const translateMaTrend = (trend: string | undefined) => {
    const normalizedTrend = (trend || 'NEUTRAL').toUpperCase()
    switch (normalizedTrend) {
      case 'BULLISH':
        return t('aiIntelligence.setup.trend.bullish', 'Bullish')
      case 'BEARISH':
        return t('aiIntelligence.setup.trend.bearish', 'Bearish')
      default:
        return t('aiIntelligence.setup.trend.neutral', 'Sideways')
    }
  }

  // Get MACD trend color
  const getMacdColor = (trend: string) => {
    const normalizedTrend = (trend || '').toUpperCase()
    if (normalizedTrend === 'BULLISH') return 'text-green-500'
    if (normalizedTrend === 'BEARISH') return 'text-red-500'
    return 'text-gray-500'
  }

  // Format price
  const formatPrice = (price: number | undefined) => {
    if (!price) return '$0.00'
    if (price >= 1000)
      return (
        '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      )
    if (price >= 1) return '$' + price.toFixed(4)
    return '$' + price.toFixed(8)
  }

  // Loading state
  if (loading) {
    return (
      <div className='p-6 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800 animate-pulse'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl' />
          <div className='space-y-2'>
            <div className='w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded' />
            <div className='w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded' />
          </div>
        </div>
        <div className='space-y-4'>
          <div className='w-full h-20 bg-gray-200 dark:bg-gray-700 rounded-xl' />
          <div className='grid grid-cols-2 gap-3'>
            <div className='h-24 bg-gray-200 dark:bg-gray-700 rounded-xl' />
            <div className='h-24 bg-gray-200 dark:bg-gray-700 rounded-xl' />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className='p-6 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800'>
        <div className='flex items-center gap-3 text-yellow-500'>
          <AlertTriangle className='w-6 h-6' />
          <span className='text-sm'>{error}</span>
        </div>
      </div>
    )
  }

  // No data
  if (!analysis) {
    return (
      <div className='p-6 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800'>
        <div className='text-center text-gray-500 dark:text-gray-400'>
          <Activity className='w-12 h-12 mx-auto mb-2 opacity-50' />
          <p className='text-sm'>
            {t('aiIntelligence.setup.selectAsset', 'Select an asset for analysis')}
          </p>
        </div>
      </div>
    )
  }

  const signalInfo = getSignalInfo(analysis.recommendation?.action)
  const SignalIcon = signalInfo.icon

  return (
    <div className='relative overflow-hidden p-6 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm'>
      {/* Background gradient */}
      <div
        className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${signalInfo.gradient} opacity-5 rounded-full -translate-y-32 translate-x-32 blur-3xl`}
      />

      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <div className='p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl'>
            <CryptoIcon symbol={analysis.symbol?.replace('USDT', '') || 'BTC'} size={28} />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
                {analysis.symbol || 'OVERVIEW'}
              </h3>
              <span className='px-2 py-0.5 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full'>
                {analysis.timeframe}
              </span>
            </div>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              {t('aiIntelligence.setup.technicalAnalysis', 'Technical Analysis')} •{' '}
              {analysis.exchange}
            </p>
          </div>
        </div>
        <div className='flex flex-col items-end'>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 ${signalInfo.bgColor} rounded-full`}
          >
            <SignalIcon className={`w-4 h-4 ${signalInfo.color}`} />
            <span className={`text-sm font-bold ${signalInfo.color}`}>{signalInfo.label}</span>
          </div>
          <p className='text-xs text-gray-500 mt-1'>
            {t('aiIntelligence.setup.confidence', 'Confidence')}: {analysis.confidence}%
          </p>
        </div>
      </div>

      {/* Current Price & Support/Resistance */}
      <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-4'>
        <div className='flex items-center justify-between mb-3'>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
            <Target className='w-4 h-4 text-blue-500' />
            {t('aiIntelligence.setup.supportResistance', 'Support & Resistance')}
          </h4>
          <span className='text-lg font-bold text-blue-600 dark:text-blue-400'>
            {formatPrice(analysis.currentPrice)}
          </span>
        </div>

        {/* Price Levels */}
        <div className='space-y-2'>
          {/* Resistance */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <ChevronUp className='w-4 h-4 text-red-500' />
              <span className='text-xs text-gray-500'>
                {t('aiIntelligence.setup.resistance', 'Resistance')}
              </span>
            </div>
            <span className='text-sm font-mono text-red-500'>
              {formatPrice(analysis.supportResistance?.resistance)}
            </span>
          </div>

          {/* Current Price indicator */}
          <div className='flex items-center justify-between py-2 px-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg border border-blue-500/30'>
            <div className='flex items-center gap-2'>
              <Circle className='w-3 h-3 fill-blue-500 text-blue-500' />
              <span className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                {t('aiIntelligence.setup.currentPrice', 'Current Price')}
              </span>
            </div>
            <span className='text-sm font-mono font-bold text-blue-600 dark:text-blue-400'>
              {formatPrice(analysis.currentPrice)}
            </span>
          </div>

          {/* Support */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <ChevronDown className='w-4 h-4 text-green-500' />
              <span className='text-xs text-gray-500'>
                {t('aiIntelligence.setup.support', 'Support')}
              </span>
            </div>
            <span className='text-sm font-mono text-green-500'>
              {formatPrice(analysis.supportResistance?.support)}
            </span>
          </div>
        </div>
      </div>

      {/* Indicators Grid */}
      <div className='grid grid-cols-2 gap-3 mb-4'>
        {/* RSI */}
        <div className='p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-xl'>
          <div className='flex items-center gap-2 mb-2'>
            <Activity className='w-4 h-4 text-purple-500' />
            <span className='text-xs text-gray-500'>RSI (14)</span>
          </div>
          <p className={`text-2xl font-bold ${getRsiColor(analysis.indicators?.rsi?.value || 50)}`}>
            {(analysis.indicators?.rsi?.value || 0).toFixed(1)}
          </p>
          <p className='text-xs text-gray-500 mt-1'>
            {translateRsiSignal(analysis.indicators?.rsi?.signal)}
          </p>
        </div>

        {/* MACD */}
        <div className='p-3 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-xl'>
          <div className='flex items-center gap-2 mb-2'>
            <BarChart3 className='w-4 h-4 text-blue-500' />
            <span className='text-xs text-gray-500'>MACD</span>
          </div>
          <p
            className={`text-lg font-bold ${getMacdColor(analysis.indicators?.macd?.trend || '')}`}
          >
            {(analysis.indicators?.macd?.value || 0) > 0 ? '+' : ''}
            {(analysis.indicators?.macd?.value || 0).toFixed(2)}
          </p>
          <div className='flex items-center gap-1 mt-1'>
            {(analysis.indicators?.macd?.trend || '').toUpperCase() === 'BULLISH' ? (
              <TrendingUp className='w-3 h-3 text-green-500' />
            ) : (analysis.indicators?.macd?.trend || '').toUpperCase() === 'BEARISH' ? (
              <TrendingDown className='w-3 h-3 text-red-500' />
            ) : (
              <Minus className='w-3 h-3 text-gray-500' />
            )}
            <span className='text-xs text-gray-500'>
              {translateMacdTrend(analysis.indicators?.macd?.trend)}
            </span>
          </div>
        </div>
      </div>

      {/* ADX & Volume */}
      <div className='grid grid-cols-2 gap-3 mb-4'>
        {/* ADX */}
        <div className='p-3 bg-gradient-to-br from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 rounded-xl'>
          <div className='flex items-center gap-2 mb-2'>
            <Zap className='w-4 h-4 text-orange-500' />
            <span className='text-xs text-gray-500'>ADX</span>
          </div>
          <p className='text-2xl font-bold text-orange-600 dark:text-orange-400'>
            {(analysis.indicators?.adx?.value || 0).toFixed(1)}
          </p>
          <p className='text-xs text-gray-500 mt-1'>
            {translateTrendStrength(analysis.indicators?.adx?.trendStrength)}
          </p>
        </div>

        {/* Volume */}
        <div className='p-3 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 dark:from-cyan-500/20 dark:to-teal-500/20 rounded-xl'>
          <div className='flex items-center gap-2 mb-2'>
            <Volume2 className='w-4 h-4 text-cyan-500' />
            <span className='text-xs text-gray-500'>
              {t('aiIntelligence.setup.volume', 'Volume')}
            </span>
          </div>
          <p className='text-lg font-bold text-cyan-600 dark:text-cyan-400'>
            {((analysis.indicators?.volume?.ratio || 0) * 100).toFixed(0)}%
          </p>
          <p className='text-xs text-gray-500 mt-1'>
            {translateVolumeSignal(analysis.indicators?.volume?.signal)}
          </p>
        </div>
      </div>

      {/* Moving Averages */}
      <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-4'>
        <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
          <Layers className='w-4 h-4 text-orange-500' />
          {t('aiIntelligence.setup.movingAverages', 'Moving Averages')}
          <span
            className={`ml-auto px-2 py-0.5 text-xs rounded-full ${
              (analysis.indicators?.movingAverages?.trend || '').toUpperCase() === 'BULLISH'
                ? 'bg-green-500/10 text-green-500'
                : (analysis.indicators?.movingAverages?.trend || '').toUpperCase() === 'BEARISH'
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-gray-500/10 text-gray-500'
            }`}
          >
            {translateMaTrend(analysis.indicators?.movingAverages?.trend)}
          </span>
        </h4>
        <div className='grid grid-cols-4 gap-2 text-center'>
          <div className='p-2 bg-white dark:bg-gray-700/50 rounded-lg'>
            <p className='text-[10px] text-gray-500'>EMA 9</p>
            <p className='text-xs font-bold text-gray-900 dark:text-white'>
              {formatPrice(analysis.indicators?.movingAverages?.ema9)}
            </p>
          </div>
          <div className='p-2 bg-white dark:bg-gray-700/50 rounded-lg'>
            <p className='text-[10px] text-gray-500'>SMA 21</p>
            <p className='text-xs font-bold text-gray-900 dark:text-white'>
              {formatPrice(analysis.indicators?.movingAverages?.sma21)}
            </p>
          </div>
          <div className='p-2 bg-white dark:bg-gray-700/50 rounded-lg'>
            <p className='text-[10px] text-gray-500'>SMA 50</p>
            <p className='text-xs font-bold text-gray-900 dark:text-white'>
              {formatPrice(analysis.indicators?.movingAverages?.sma50)}
            </p>
          </div>
          <div className='p-2 bg-white dark:bg-gray-700/50 rounded-lg'>
            <p className='text-[10px] text-gray-500'>SMA 200</p>
            <p className='text-xs font-bold text-gray-900 dark:text-white'>
              {formatPrice(analysis.indicators?.movingAverages?.sma200)}
            </p>
          </div>
        </div>
      </div>

      {/* Bollinger Bands */}
      <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-4'>
        <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-3'>
          {t('aiIntelligence.setup.bollingerBands', 'Bollinger Bands')}
        </h4>
        <div className='space-y-2'>
          <div className='flex justify-between text-xs'>
            <span className='text-gray-500'>{t('aiIntelligence.setup.upper', 'Upper')}</span>
            <span className='text-red-500 font-mono'>
              {formatPrice(analysis.indicators?.bollingerBands?.upper)}
            </span>
          </div>
          <div className='flex justify-between text-xs'>
            <span className='text-gray-500'>{t('aiIntelligence.setup.middle', 'Middle')}</span>
            <span className='text-gray-600 dark:text-gray-400 font-mono'>
              {formatPrice(analysis.indicators?.bollingerBands?.middle)}
            </span>
          </div>
          <div className='flex justify-between text-xs'>
            <span className='text-gray-500'>{t('aiIntelligence.setup.lower', 'Lower')}</span>
            <span className='text-green-500 font-mono'>
              {formatPrice(analysis.indicators?.bollingerBands?.lower)}
            </span>
          </div>
          <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
            <p className='text-xs text-gray-500'>
              {t('aiIntelligence.setup.signalLabel', 'Signal')}:{' '}
              <span className='font-medium text-gray-700 dark:text-gray-300'>
                {analysis.indicators?.bollingerBands?.signal || 'NEUTRAL'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Trading Signals */}
      {analysis.recommendation?.signals && analysis.recommendation.signals.length > 0 && (
        <div className='p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-xl border border-purple-500/20'>
          <div className='flex items-start gap-2'>
            <Sparkles className='w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-xs font-medium text-purple-600 dark:text-purple-400 mb-2'>
                {t('aiIntelligence.setup.tradingSignals', 'Trading Signals')}
              </p>
              <div className='flex flex-wrap gap-1.5'>
                {analysis.recommendation.signals.map((signal, idx) => (
                  <span
                    key={idx}
                    className='px-2 py-0.5 text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full'
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Quality Badge */}
      <div className='flex items-center justify-between mt-3'>
        <span className='text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full'>
          {analysis.dataQuality || 'REAL_MARKET_DATA'}
        </span>
        <p className='text-[10px] text-gray-400 flex items-center gap-1'>
          <Clock className='w-3 h-3' />
          {t('aiIntelligence.sentiment.updated', 'Updated')}:{' '}
          {new Date(analysis.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}

export default TechnicalOverviewCard
