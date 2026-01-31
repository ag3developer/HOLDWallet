/**
 * MarketSentimentCard - Shows market sentiment analysis from TrayOps API
 * Displays social sentiment, AI insights, and asset breakdown
 * Uses REAL DATA from /api/market-intelligence/social-sentiment
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Heart,
  AlertTriangle,
  Activity,
  Sparkles,
  Clock,
  BarChart3,
  Hash,
  Target,
  Shield,
} from 'lucide-react'
import { MarketSentiment } from '@/services/trayopsService'
import { CryptoIcon } from '@/components/CryptoIcon'

interface MarketSentimentCardProps {
  sentiment: MarketSentiment | null
  loading?: boolean
  error?: string | null
}

export const MarketSentimentCard: React.FC<MarketSentimentCardProps> = ({
  sentiment,
  loading = false,
  error = null,
}) => {
  const { t } = useTranslation()

  // Get sentiment color and info based on mood level
  const getSentimentInfo = (moodLevel: string) => {
    switch (moodLevel) {
      case 'very_negative':
        return {
          label: t('aiIntelligence.sentiment.veryNegative', 'Very Bearish'),
          color: 'text-red-600',
          bgColor: 'bg-red-500/10 dark:bg-red-500/20',
          borderColor: 'border-red-500/30',
          gradient: 'from-red-600 to-rose-700',
        }
      case 'negative':
        return {
          label: t('aiIntelligence.sentiment.negative', 'Bearish'),
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
          borderColor: 'border-orange-500/30',
          gradient: 'from-orange-500 to-amber-600',
        }
      case 'neutral':
        return {
          label: t('aiIntelligence.sentiment.neutral', 'Neutral'),
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10 dark:bg-gray-500/20',
          borderColor: 'border-gray-500/30',
          gradient: 'from-gray-500 to-slate-600',
        }
      case 'positive':
        return {
          label: t('aiIntelligence.sentiment.positive', 'Bullish'),
          color: 'text-green-500',
          bgColor: 'bg-green-500/10 dark:bg-green-500/20',
          borderColor: 'border-green-500/30',
          gradient: 'from-green-500 to-emerald-600',
        }
      case 'very_positive':
        return {
          label: t('aiIntelligence.sentiment.veryPositive', 'Very Bullish'),
          color: 'text-green-600',
          bgColor: 'bg-green-500/10 dark:bg-green-500/20',
          borderColor: 'border-green-500/30',
          gradient: 'from-green-600 to-emerald-700',
        }
      default:
        return {
          label: t('aiIntelligence.sentiment.unknown', 'Unknown'),
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/30',
          gradient: 'from-gray-500 to-slate-600',
        }
    }
  }

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    return num.toLocaleString()
  }

  // Loading state
  if (loading) {
    return (
      <div className='p-6 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800 animate-pulse'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl' />
          <div className='space-y-2'>
            <div className='w-40 h-5 bg-gray-200 dark:bg-gray-700 rounded' />
            <div className='w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded' />
          </div>
        </div>
        <div className='w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4' />
        <div className='grid grid-cols-2 gap-3'>
          <div className='h-20 bg-gray-200 dark:bg-gray-700 rounded-xl' />
          <div className='h-20 bg-gray-200 dark:bg-gray-700 rounded-xl' />
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
  if (!sentiment) {
    return (
      <div className='p-6 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800'>
        <div className='text-center text-gray-500 dark:text-gray-400'>
          <Activity className='w-12 h-12 mx-auto mb-2 opacity-50' />
          <p className='text-sm'>
            {t('aiIntelligence.sentiment.noData', 'Sentiment data not available')}
          </p>
        </div>
      </div>
    )
  }

  const sentimentInfo = getSentimentInfo(sentiment.aiInsights?.moodLevel || 'neutral')

  return (
    <div className='relative overflow-hidden p-6 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm'>
      {/* Background gradient */}
      <div
        className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${sentimentInfo.gradient} opacity-5 rounded-full -translate-y-32 translate-x-32 blur-3xl`}
      />

      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <div className={`p-3 ${sentimentInfo.bgColor} rounded-xl`}>
            <Heart className={`w-6 h-6 ${sentimentInfo.color}`} />
          </div>
          <div>
            <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
              {t('aiIntelligence.sentiment.title', 'Market Sentiment')}
            </h3>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              {t('aiIntelligence.sentiment.realTimeData', 'Real-time social data')}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1.5 ${sentimentInfo.bgColor} rounded-full`}>
          <span className={`text-sm font-bold ${sentimentInfo.color}`}>{sentimentInfo.label}</span>
        </div>
      </div>

      {/* Overall Summary */}
      <div className='p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800 rounded-xl mb-4'>
        <div className='grid grid-cols-3 gap-4 text-center'>
          <div>
            <p className='text-2xl font-bold text-gray-900 dark:text-white'>
              {((sentiment.summary?.averageScore || 0) * 100).toFixed(0)}
            </p>
            <p className='text-xs text-gray-500'>{t('aiIntelligence.sentiment.score', 'Score')}</p>
          </div>
          <div>
            <p className='text-2xl font-bold text-green-500'>
              {sentiment.summary?.positiveAssets || 0}
            </p>
            <p className='text-xs text-gray-500'>
              {t('aiIntelligence.sentiment.bullish', 'Bullish')}
            </p>
          </div>
          <div>
            <p className='text-2xl font-bold text-red-500'>
              {sentiment.summary?.negativeAssets || 0}
            </p>
            <p className='text-xs text-gray-500'>
              {t('aiIntelligence.sentiment.bearish', 'Bearish')}
            </p>
          </div>
        </div>
        <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-700'>
          <p className='text-xs text-gray-500 text-center'>
            {t('aiIntelligence.sentiment.totalVolume', 'Total 24h Volume')}:{' '}
            {formatNumber(sentiment.summary?.totalVolume || 0)}
          </p>
        </div>
      </div>

      {/* AI Insights - Market Mood */}
      {sentiment.aiInsights && (
        <div className='p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-xl border border-purple-500/20 mb-4'>
          <div className='flex items-start gap-2 mb-3'>
            <Sparkles className='w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-sm font-bold text-purple-600 dark:text-purple-400'>
                {t('aiIntelligence.sentiment.aiAnalysis', 'AI Analysis')}
              </p>
              <p className='text-sm text-gray-700 dark:text-gray-300 mt-1'>
                {sentiment.aiInsights.marketMood}
              </p>
            </div>
          </div>

          {/* Key Observations */}
          {sentiment.aiInsights.keyObservations &&
            sentiment.aiInsights.keyObservations.length > 0 && (
              <div className='space-y-2 mt-3'>
                {sentiment.aiInsights.keyObservations.slice(0, 3).map((observation, idx) => (
                  <div key={`obs-${idx}`} className='flex items-start gap-2'>
                    <Target className='w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0' />
                    <p className='text-xs text-gray-600 dark:text-gray-400'>{observation}</p>
                  </div>
                ))}
              </div>
            )}

          {/* Risk Assessment */}
          {sentiment.aiInsights.riskAssessment && (
            <div className='mt-3 pt-3 border-t border-purple-500/20'>
              <div className='flex items-center gap-2'>
                <Shield className='w-4 h-4 text-orange-500' />
                <span className='text-xs font-medium text-orange-600 dark:text-orange-400'>
                  {sentiment.aiInsights.riskAssessment}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trading Recommendations */}
      {sentiment.aiInsights?.tradingRecommendations &&
        sentiment.aiInsights.tradingRecommendations.length > 0 && (
          <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-4'>
            <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
              <BarChart3 className='w-4 h-4 text-blue-500' />
              {t('aiIntelligence.sentiment.recommendations', 'AI Recommendations')}
            </h4>
            <div className='space-y-2'>
              {sentiment.aiInsights.tradingRecommendations.map((rec, idx) => (
                <div key={`rec-${idx}`} className='flex items-start gap-2'>
                  <div className='w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0' />
                  <p className='text-xs text-gray-600 dark:text-gray-400'>{rec}</p>
                </div>
              ))}
            </div>
            <div className='mt-3 flex items-center justify-between text-xs'>
              <span className='text-gray-500'>
                {t('aiIntelligence.sentiment.confidence', 'Confidence')}
              </span>
              <span className='font-bold text-blue-600 dark:text-blue-400'>
                {((sentiment.aiInsights.confidenceLevel || 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}

      {/* Asset Breakdown */}
      {sentiment.assets && sentiment.assets.length > 0 && (
        <div className='space-y-3'>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
            <Activity className='w-4 h-4 text-green-500' />
            {t('aiIntelligence.sentiment.assetBreakdown', 'Asset Breakdown')}
          </h4>
          {sentiment.assets.slice(0, 5).map((asset, idx) => (
            <div
              key={`asset-${idx}`}
              className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-between'
            >
              <div className='flex items-center gap-3'>
                <CryptoIcon symbol={asset.symbol} size={24} />
                <div className='font-bold text-gray-900 dark:text-white'>{asset.symbol}</div>
                <div
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    asset.sentiment?.includes('positive')
                      ? 'bg-green-500/10 text-green-500'
                      : asset.sentiment?.includes('negative')
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-gray-500/10 text-gray-500'
                  }`}
                >
                  {(asset.sentiment || 'neutral').replace('_', ' ')}
                </div>
              </div>
              <div className='text-right'>
                <p className='text-sm font-bold text-gray-900 dark:text-white'>
                  ${(asset.price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p
                  className={`text-xs ${(asset.change24h || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}
                >
                  {(asset.change24h || 0) >= 0 ? '+' : ''}
                  {(asset.change24h || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trending Hashtags for first asset */}
      {sentiment.assets?.[0]?.trendingHashtags &&
        sentiment.assets[0].trendingHashtags.length > 0 && (
          <div className='mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl'>
            <h4 className='text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1'>
              <Hash className='w-3 h-3' />
              {t('aiIntelligence.sentiment.trending', 'Trending')}
            </h4>
            <div className='flex flex-wrap gap-1.5'>
              {sentiment.assets[0].trendingHashtags.slice(0, 6).map((tag, idx) => (
                <span
                  key={`tag-${idx}`}
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    tag.color === 'red'
                      ? 'bg-red-500/10 text-red-500'
                      : tag.color === 'green'
                        ? 'bg-green-500/10 text-green-500'
                        : tag.color === 'blue'
                          ? 'bg-blue-500/10 text-blue-500'
                          : tag.color === 'purple'
                            ? 'bg-purple-500/10 text-purple-500'
                            : 'bg-yellow-500/10 text-yellow-600'
                  }`}
                >
                  {tag.tag}
                </span>
              ))}
            </div>
          </div>
        )}

      {/* Timestamp */}
      <p className='text-[10px] text-gray-400 text-right mt-3 flex items-center justify-end gap-1'>
        <Clock className='w-3 h-3' />
        {t('aiIntelligence.sentiment.updated', 'Updated')}:{' '}
        {new Date(sentiment.timestamp).toLocaleTimeString()}
      </p>
    </div>
  )
}

export default MarketSentimentCard
