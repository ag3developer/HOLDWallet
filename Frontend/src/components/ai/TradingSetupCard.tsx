/**
 * TradingSetupCard - Shows intelligent trading setup from TrayOps API
 * Displays entry, stop loss, take profit levels with visual representation
 * Uses REAL DATA from /api/intelligent-setup/{symbol}
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Target,
  AlertTriangle,
  Shield,
  Percent,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  Sparkles,
  Info,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Volume2,
} from 'lucide-react'
import { TradingSetup } from '@/services/trayopsService'
import { CryptoIcon } from '@/components/CryptoIcon'

interface TradingSetupCardProps {
  setup: TradingSetup | null
  loading?: boolean
  error?: string | null
}

export const TradingSetupCard: React.FC<TradingSetupCardProps> = ({
  setup,
  loading = false,
  error = null,
}) => {
  const { t } = useTranslation()

  // Get setup type color and icon based on action
  const getSetupTypeInfo = (action: string | undefined) => {
    const normalizedAction = (action || 'HOLD').toUpperCase()

    switch (normalizedAction) {
      case 'BUY':
        return {
          color: 'text-green-500',
          bgColor: 'bg-green-500/10 dark:bg-green-500/20',
          borderColor: 'border-green-500/30',
          icon: ArrowUpCircle,
          label: t('aiIntelligence.setup.buy', 'BUY'),
          gradient: 'from-green-500 to-emerald-600',
        }
      case 'SELL':
        return {
          color: 'text-red-500',
          bgColor: 'bg-red-500/10 dark:bg-red-500/20',
          borderColor: 'border-red-500/30',
          icon: ArrowDownCircle,
          label: t('aiIntelligence.setup.sell', 'SELL'),
          gradient: 'from-red-500 to-rose-600',
        }
      default:
        return {
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10 dark:bg-gray-500/20',
          borderColor: 'border-gray-500/30',
          icon: MinusCircle,
          label: t('aiIntelligence.setup.hold', 'HOLD'),
          gradient: 'from-gray-500 to-slate-600',
        }
    }
  }

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500'
    if (confidence >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  // Get RSI color
  const getRsiColor = (value: number) => {
    if (value >= 70) return 'text-red-500'
    if (value <= 30) return 'text-green-500'
    return 'text-gray-600 dark:text-gray-400'
  }

  // Format price
  const formatPrice = (price: number | undefined) => {
    if (!price) return '0.00'
    if (price >= 1000)
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (price >= 1) return price.toFixed(4)
    return price.toFixed(8)
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
          <div className='w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-xl' />
          <div className='w-full h-16 bg-gray-200 dark:bg-gray-700 rounded-xl' />
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
  if (!setup) {
    return (
      <div className='p-6 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800'>
        <div className='text-center text-gray-500 dark:text-gray-400'>
          <Target className='w-12 h-12 mx-auto mb-2 opacity-50' />
          <p className='text-sm'>
            {t('aiIntelligence.setup.selectAsset', 'Select an asset to see the setup')}
          </p>
        </div>
      </div>
    )
  }

  const setupInfo = getSetupTypeInfo(setup.action)
  const SetupIcon = setupInfo.icon

  return (
    <div className='relative overflow-hidden p-6 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm'>
      {/* Background gradient */}
      <div
        className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${setupInfo.gradient} opacity-5 rounded-full -translate-y-32 translate-x-32 blur-3xl`}
      />

      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <div className={`p-3 ${setupInfo.bgColor} rounded-xl`}>
            <CryptoIcon symbol={setup.symbol?.replace('USDT', '') || 'BTC'} size={28} />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h3 className='text-lg font-bold text-gray-900 dark:text-white'>{setup.symbol}</h3>
              <span
                className={`px-2 py-0.5 text-xs font-bold ${setupInfo.bgColor} ${setupInfo.color} rounded-full flex items-center gap-1`}
              >
                <SetupIcon className='w-3 h-3' />
                {setupInfo.label}
              </span>
            </div>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              {setup.timeframe} • {setup.strength}
            </p>
          </div>
        </div>
        <div className='text-right'>
          <div className='flex items-center gap-1 justify-end'>
            <Sparkles className={`w-4 h-4 ${getConfidenceColor(setup.confidence)}`} />
            <span className={`text-lg font-bold ${getConfidenceColor(setup.confidence)}`}>
              {setup.confidence}%
            </span>
          </div>
          <p className='text-xs text-gray-500'>
            {t('aiIntelligence.setup.confidence', 'Confidence')}
          </p>
        </div>
      </div>

      {/* Price Levels Visual */}
      <div className='relative p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-4'>
        <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
          <Target className='w-4 h-4 text-blue-500' />
          {t('aiIntelligence.setup.priceLevels', 'Price Levels')}
        </h4>
        <div className='space-y-3'>
          {/* Take Profit */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 rounded-full bg-green-500' />
              <span className='text-xs text-gray-500'>
                {t('aiIntelligence.setup.takeProfit', 'Take Profit')}
              </span>
            </div>
            <span className='text-sm font-mono font-medium text-green-500'>
              ${formatPrice(setup.takeProfit)}
            </span>
          </div>

          {/* Entry */}
          <div className='flex items-center justify-between py-2 px-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg border border-blue-500/30'>
            <div className='flex items-center gap-2'>
              <Target className='w-4 h-4 text-blue-500' />
              <span className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                {t('aiIntelligence.setup.entry', 'Entry')}
              </span>
            </div>
            <span className='text-sm font-mono font-bold text-blue-600 dark:text-blue-400'>
              ${formatPrice(setup.entryPrice)}
            </span>
          </div>

          {/* Current Price */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 rounded-full bg-gray-400' />
              <span className='text-xs text-gray-500'>
                {t('aiIntelligence.setup.currentPrice', 'Current Price')}
              </span>
            </div>
            <span className='text-sm font-mono font-medium text-gray-600 dark:text-gray-400'>
              ${formatPrice(setup.currentPrice)}
            </span>
          </div>

          {/* Stop Loss */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 rounded-full bg-red-500' />
              <span className='text-xs text-gray-500'>
                {t('aiIntelligence.setup.stopLoss', 'Stop Loss')}
              </span>
            </div>
            <span className='text-sm font-mono font-medium text-red-500'>
              ${formatPrice(setup.stopLoss)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-2 gap-3 mb-4'>
        <div className='p-3 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-xl'>
          <div className='flex items-center gap-2 mb-1'>
            <Percent className='w-4 h-4 text-blue-500' />
            <span className='text-xs text-gray-500'>
              {t('aiIntelligence.setup.riskReward', 'Risk/Reward')}
            </span>
          </div>
          <p className='text-lg font-bold text-blue-600 dark:text-blue-400'>
            1:{(setup.riskRewardRatio || 0).toFixed(1)}
          </p>
        </div>
        <div className='p-3 bg-gradient-to-br from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 rounded-xl'>
          <div className='flex items-center gap-2 mb-1'>
            <Shield className='w-4 h-4 text-orange-500' />
            <span className='text-xs text-gray-500'>
              {t('aiIntelligence.setup.riskPercent', 'Risk %')}
            </span>
          </div>
          <p className='text-lg font-bold text-orange-600 dark:text-orange-400'>
            {(setup.riskPercentage || 0).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className='grid grid-cols-3 gap-2 mb-4'>
        {/* RSI */}
        <div className='p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center'>
          <Activity className='w-4 h-4 text-purple-500 mx-auto mb-1' />
          <p className='text-[10px] text-gray-500'>RSI</p>
          <p className={`text-sm font-bold ${getRsiColor(setup.rsi || 50)}`}>
            {(setup.rsi || 0).toFixed(1)}
          </p>
        </div>

        {/* MACD */}
        <div className='p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center'>
          <BarChart3 className='w-4 h-4 text-blue-500 mx-auto mb-1' />
          <p className='text-[10px] text-gray-500'>MACD</p>
          <p
            className={`text-sm font-bold ${
              (setup.macdTrend || '').toUpperCase() === 'BULLISH'
                ? 'text-green-500'
                : (setup.macdTrend || '').toUpperCase() === 'BEARISH'
                  ? 'text-red-500'
                  : 'text-gray-500'
            }`}
          >
            {setup.macdTrend || 'N/A'}
          </p>
        </div>

        {/* Volume */}
        <div className='p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center'>
          <Volume2 className='w-4 h-4 text-cyan-500 mx-auto mb-1' />
          <p className='text-[10px] text-gray-500'>{t('aiIntelligence.setup.volume', 'Volume')}</p>
          <p className='text-sm font-bold text-cyan-600 dark:text-cyan-400'>
            {setup.volumeSignal || 'N/A'}
          </p>
        </div>
      </div>

      {/* Support & Resistance */}
      <div className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-4'>
        <h4 className='text-xs font-semibold text-gray-500 mb-2'>
          {t('aiIntelligence.setup.supportResistance', 'Support & Resistance')}
        </h4>
        <div className='flex justify-between'>
          <div className='flex items-center gap-2'>
            <TrendingDown className='w-3 h-3 text-green-500' />
            <span className='text-xs text-gray-500'>
              {t('aiIntelligence.setup.support', 'Support')}
            </span>
            <span className='text-xs font-mono font-medium text-green-500'>
              ${formatPrice(setup.support)}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <TrendingUp className='w-3 h-3 text-red-500' />
            <span className='text-xs text-gray-500'>
              {t('aiIntelligence.setup.resistance', 'Resistance')}
            </span>
            <span className='text-xs font-mono font-medium text-red-500'>
              ${formatPrice(setup.resistance)}
            </span>
          </div>
        </div>
      </div>

      {/* Trading Signals */}
      {setup.signals && setup.signals.length > 0 && (
        <div className='p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-xl border border-purple-500/20'>
          <div className='flex items-start gap-2'>
            <Info className='w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-xs font-medium text-purple-600 dark:text-purple-400 mb-2'>
                {t('aiIntelligence.setup.tradingSignals', 'Trading Signals')}
              </p>
              <div className='flex flex-wrap gap-1.5'>
                {setup.signals.map((signal, idx) => (
                  <span
                    key={`signal-${idx}`}
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

      {/* Data Quality & Timestamp */}
      <div className='flex items-center justify-between mt-3'>
        <span className='text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full'>
          {setup.dataQuality || 'REAL_DATA'}
        </span>
        <p className='text-[10px] text-gray-400 flex items-center gap-1'>
          <Clock className='w-3 h-3' />
          {t('aiIntelligence.sentiment.updated', 'Updated')}:{' '}
          {new Date(setup.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}

export default TradingSetupCard
