/**
 * TrayOps API Service - Advanced Trading Analysis
 *
 * Integrates with api.trayops.com for:
 * - Technical Analysis Overview (RSI, MACD, Support/Resistance)
 * - Intelligent Trading Setups (Entry, Stop Loss, Take Profit)
 * - Market Sentiment Analysis (Social Sentiment)
 * - TrayOps Score (Multi-criteria analysis)
 *
 * ALL DATA IS 100% REAL - NO MOCK/FALLBACK DATA
 */

import axios from 'axios'

const TRAYOPS_API_URL = 'https://api.trayops.com/v1'

// Create axios instance for TrayOps API
const trayopsClient = axios.create({
  baseURL: TRAYOPS_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export type Timeframe = '15m' | '30m' | '1h' | '4h' | '1d'
export type Exchange = 'binance' | 'bybit' | 'bitget'

// API Response Types - Match actual TrayOps API responses

export interface TechnicalAnalysisResponse {
  success: boolean
  data: {
    symbol: string
    timeframe: string
    current_price: number
    timestamp: number
    data_source: string
    data_quality: string
    total_candles: number
    indicators: {
      rsi: {
        value: number
        signal: string
        period: number
        data_type: string
      }
      macd: {
        macd: number
        signal: number
        histogram: number
        trend: string
        data_type: string
      }
      bollinger_bands: {
        upper: number
        middle: number
        lower: number
        current_price: number
        signal: string
        data_type: string
      }
      moving_averages: {
        sma9: number
        ema9: number
        sma21: number
        ema21: number
        sma50: number
        ema50: number
        sma200: number
        ema200: number
        trend: string
        data_type: string
      }
      adx: {
        value: number
        trend_strength: string
        data_type: string
      }
      volume_profile: {
        current_volume: number
        avg_volume: number
        volume_ratio: number
        signal: string
        data_type: string
      }
      volume: {
        ratio: number
        signal: string
      }
    }
    support_resistance: {
      support: number
      resistance: number
      strength: string
      data_type: string
    }
    recommendation: {
      action: string
      strength: string
      score: number
      signals: string[]
      data_type: string
    }
    confidence: number
  }
  message: string
  data_guarantee: string
}

export interface IntelligentSetupResponse {
  success: boolean
  data: {
    symbol: string
    timeframe: string
    timestamp: number
    data_quality: string
    confidence: number
    trading_setup: {
      action: 'BUY' | 'SELL' | 'HOLD'
      strength: string
      entry_price: number
      stop_loss: number
      take_profit: number
      risk_reward_ratio: number
      risk_percentage: number
    }
    real_analysis: {
      current_price: number
      support: number
      resistance: number
      signals: string[]
      rsi: number
      macd_trend: string
      volume_signal: string
    }
  }
  message: string
  guarantee: string
}

export interface SocialSentimentResponse {
  success: boolean
  data: Array<{
    symbol: string
    name: string
    sentiment: string
    sentiment_score: number
    price: number
    change_24h: number
    volume_24h: number
    volume_score: number
    market_cap: number
    social_mentions: number
    mentions_breakdown: {
      positive_percent: number
      negative_percent: number
      neutral_percent: number
    }
    trending_hashtags: Array<{
      tag: string
      relevance: number
      color: string
    }>
    evaluation_scores: {
      reliability: number
      volume_quality: number
      price_momentum: number
      market_interest: number
    }
    news_sentiment: string
    fear_greed_component: number
    timestamp: string
  }>
  summary: {
    overall_sentiment: string
    average_score: number
    total_volume: number
    positive_assets: number
    negative_assets: number
    assets_analyzed: number
  }
  ai_insights: {
    market_mood: string
    key_observations: string[]
    trading_recommendations: string[]
    risk_assessment: string
    confidence_level: number
    mood_level: string
  }
  timestamp: string
}

export interface TrayOpsScoreResponse {
  success: boolean
  data: {
    symbol: string
    timeframe: string
    trayops_score: number
    score_breakdown: {
      technical_score: number
      volume_score: number
      price_action_score: number
      risk_reward_score: number
      sentiment_score: number
    }
    recommendation: string
    confidence: number
    signals: string[]
    timestamp: string
  }
  message: string
}

// Transformed Types for UI Components

export interface TechnicalAnalysisOverview {
  symbol: string
  timeframe: string
  exchange: string
  currentPrice: number
  indicators: {
    rsi: {
      value: number
      signal: string
      description: string
    }
    macd: {
      value: number
      signal: number
      histogram: number
      trend: string
      description: string
    }
    movingAverages: {
      sma9: number
      ema9: number
      sma21: number
      ema21: number
      sma50: number
      ema50: number
      sma200: number
      ema200: number
      trend: string
    }
    bollingerBands: {
      upper: number
      middle: number
      lower: number
      signal: string
    }
    adx: {
      value: number
      trendStrength: string
    }
    volume: {
      current: number
      average: number
      ratio: number
      signal: string
    }
  }
  supportResistance: {
    support: number
    resistance: number
    strength: string
  }
  recommendation: {
    action: string
    strength: string
    score: number
    signals: string[]
  }
  confidence: number
  dataQuality: string
  timestamp: string
}

export interface TradingSetup {
  symbol: string
  timeframe: string
  action: 'BUY' | 'SELL' | 'HOLD'
  strength: string
  entryPrice: number
  stopLoss: number
  takeProfit: number
  riskRewardRatio: number
  riskPercentage: number
  currentPrice: number
  support: number
  resistance: number
  signals: string[]
  rsi: number
  macdTrend: string
  volumeSignal: string
  confidence: number
  dataQuality: string
  timestamp: string
}

export interface MarketSentiment {
  assets: Array<{
    symbol: string
    name: string
    sentiment: string
    sentimentScore: number
    price: number
    change24h: number
    volume24h: number
    socialMentions: number
    mentionsBreakdown: {
      positive: number
      negative: number
      neutral: number
    }
    trendingHashtags: Array<{
      tag: string
      relevance: number
      color: string
    }>
    newsSentiment: string
    fearGreedComponent: number
  }>
  summary: {
    overallSentiment: string
    averageScore: number
    totalVolume: number
    positiveAssets: number
    negativeAssets: number
    assetsAnalyzed: number
  }
  aiInsights: {
    marketMood: string
    keyObservations: string[]
    tradingRecommendations: string[]
    riskAssessment: string
    confidenceLevel: number
    moodLevel: string
  }
  timestamp: string
}

// API Functions
export const trayopsService = {
  /**
   * Get comprehensive technical analysis overview
   * Uses: /api/technical-analysis/overview
   */
  async getTechnicalAnalysisOverview(
    symbol: string = 'BTC',
    timeframe: Timeframe = '4h',
    exchange: Exchange = 'binance'
  ): Promise<TechnicalAnalysisOverview> {
    console.log(`[TrayOps] Fetching technical analysis for ${symbol} ${timeframe}`)

    const response = await trayopsClient.get<TechnicalAnalysisResponse>(
      '/api/technical-analysis/overview',
      {
        params: {
          symbol: symbol.toUpperCase(),
          timeframe,
          exchange,
        },
      }
    )

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch technical analysis')
    }

    const data = response.data.data

    // Transform API response to UI format
    return {
      symbol: data.symbol,
      timeframe: data.timeframe,
      exchange: data.data_source,
      currentPrice: data.current_price,
      indicators: {
        rsi: {
          value: data.indicators.rsi.value,
          signal: data.indicators.rsi.signal,
          description: this.getRsiDescription(
            data.indicators.rsi.value,
            data.indicators.rsi.signal
          ),
        },
        macd: {
          value: data.indicators.macd.macd,
          signal: data.indicators.macd.signal,
          histogram: data.indicators.macd.histogram,
          trend: data.indicators.macd.trend,
          description: this.getMacdDescription(data.indicators.macd.trend),
        },
        movingAverages: {
          sma9: data.indicators.moving_averages.sma9,
          ema9: data.indicators.moving_averages.ema9,
          sma21: data.indicators.moving_averages.sma21,
          ema21: data.indicators.moving_averages.ema21,
          sma50: data.indicators.moving_averages.sma50,
          ema50: data.indicators.moving_averages.ema50,
          sma200: data.indicators.moving_averages.sma200,
          ema200: data.indicators.moving_averages.ema200,
          trend: data.indicators.moving_averages.trend,
        },
        bollingerBands: {
          upper: data.indicators.bollinger_bands.upper,
          middle: data.indicators.bollinger_bands.middle,
          lower: data.indicators.bollinger_bands.lower,
          signal: data.indicators.bollinger_bands.signal,
        },
        adx: {
          value: data.indicators.adx.value,
          trendStrength: data.indicators.adx.trend_strength,
        },
        volume: {
          current: data.indicators.volume_profile.current_volume,
          average: data.indicators.volume_profile.avg_volume,
          ratio: data.indicators.volume_profile.volume_ratio,
          signal: data.indicators.volume_profile.signal,
        },
      },
      supportResistance: {
        support: data.support_resistance.support,
        resistance: data.support_resistance.resistance,
        strength: data.support_resistance.strength,
      },
      recommendation: {
        action: data.recommendation.action,
        strength: data.recommendation.strength,
        score: data.recommendation.score,
        signals: data.recommendation.signals,
      },
      confidence: data.confidence,
      dataQuality: data.data_quality,
      timestamp: new Date(data.timestamp).toISOString(),
    }
  },

  /**
   * Get intelligent trading setup with entry, SL, TP levels
   * Uses: /api/intelligent-setup/{symbol}
   */
  async getIntelligentSetup(symbol: string, timeframe: Timeframe = '4h'): Promise<TradingSetup> {
    console.log(`[TrayOps] Fetching intelligent setup for ${symbol} ${timeframe}`)

    const response = await trayopsClient.get<IntelligentSetupResponse>(
      `/api/intelligent-setup/${symbol.toUpperCase()}`,
      {
        params: { timeframe },
      }
    )

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch intelligent setup')
    }

    const data = response.data.data
    const setup = data.trading_setup
    const analysis = data.real_analysis

    return {
      symbol: data.symbol,
      timeframe: data.timeframe,
      action: setup.action,
      strength: setup.strength,
      entryPrice: setup.entry_price,
      stopLoss: setup.stop_loss,
      takeProfit: setup.take_profit,
      riskRewardRatio: setup.risk_reward_ratio,
      riskPercentage: setup.risk_percentage,
      currentPrice: analysis.current_price,
      support: analysis.support,
      resistance: analysis.resistance,
      signals: analysis.signals,
      rsi: analysis.rsi,
      macdTrend: analysis.macd_trend,
      volumeSignal: analysis.volume_signal,
      confidence: data.confidence,
      dataQuality: data.data_quality,
      timestamp: new Date(data.timestamp).toISOString(),
    }
  },

  /**
   * Get market sentiment analysis based on social data
   * Uses: /api/market-intelligence/social-sentiment
   */
  async getSocialSentiment(symbols: string = 'BTC,ETH,SOL,BNB,XRP'): Promise<MarketSentiment> {
    console.log(`[TrayOps] Fetching social sentiment for ${symbols}`)

    const response = await trayopsClient.get<SocialSentimentResponse>(
      '/api/market-intelligence/social-sentiment',
      {
        params: { symbols },
      }
    )

    if (!response.data.success) {
      throw new Error('Failed to fetch social sentiment')
    }

    const data = response.data

    return {
      assets: data.data.map(asset => ({
        symbol: asset.symbol,
        name: asset.name,
        sentiment: asset.sentiment,
        sentimentScore: asset.sentiment_score,
        price: asset.price,
        change24h: asset.change_24h,
        volume24h: asset.volume_24h,
        socialMentions: asset.social_mentions,
        mentionsBreakdown: {
          positive: asset.mentions_breakdown.positive_percent,
          negative: asset.mentions_breakdown.negative_percent,
          neutral: asset.mentions_breakdown.neutral_percent,
        },
        trendingHashtags: asset.trending_hashtags,
        newsSentiment: asset.news_sentiment,
        fearGreedComponent: asset.fear_greed_component,
      })),
      summary: {
        overallSentiment: data.summary.overall_sentiment,
        averageScore: data.summary.average_score,
        totalVolume: data.summary.total_volume,
        positiveAssets: data.summary.positive_assets,
        negativeAssets: data.summary.negative_assets,
        assetsAnalyzed: data.summary.assets_analyzed,
      },
      aiInsights: {
        marketMood: data.ai_insights.market_mood,
        keyObservations: data.ai_insights.key_observations,
        tradingRecommendations: data.ai_insights.trading_recommendations,
        riskAssessment: data.ai_insights.risk_assessment,
        confidenceLevel: data.ai_insights.confidence_level,
        moodLevel: data.ai_insights.mood_level,
      },
      timestamp: data.timestamp,
    }
  },

  /**
   * Get TrayOps Score - Multi-criteria analysis
   * Uses: /api/trayops-score/{symbol}
   */
  async getTrayOpsScore(
    symbol: string,
    timeframe: Timeframe = '4h'
  ): Promise<TrayOpsScoreResponse['data']> {
    console.log(`[TrayOps] Fetching TrayOps score for ${symbol} ${timeframe}`)

    const response = await trayopsClient.get<TrayOpsScoreResponse>(
      `/api/trayops-score/${symbol.toUpperCase()}`,
      {
        params: { timeframe },
      }
    )

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch TrayOps score')
    }

    return response.data.data
  },

  /**
   * Get market dominance data
   * Uses: /api/market-intelligence/market-dominance
   */
  async getMarketDominance(): Promise<{
    btc_dominance: number
    eth_dominance: number
    others_dominance: number
    timestamp: string
  }> {
    console.log('[TrayOps] Fetching market dominance')

    const response = await trayopsClient.get('/api/market-intelligence/market-dominance')
    return response.data.data
  },

  // Helper functions for descriptions
  getRsiDescription(value: number, signal: string): string {
    if (signal === 'OVERSOLD')
      return `RSI at ${value.toFixed(2)} - Asset may be oversold, potential buying opportunity`
    if (signal === 'OVERBOUGHT')
      return `RSI at ${value.toFixed(2)} - Asset may be overbought, consider taking profits`
    return `RSI at ${value.toFixed(2)} - Neutral zone, momentum is balanced`
  },

  getMacdDescription(trend: string): string {
    if (trend === 'BULLISH') return 'MACD indicates bullish momentum, positive crossover'
    if (trend === 'BEARISH') return 'MACD indicates bearish pressure, negative divergence'
    return 'MACD in neutral territory, awaiting clear direction'
  },
}

export default trayopsService
