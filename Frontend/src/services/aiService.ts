/**
 * AI Service - API calls for AI Intelligence Module
 *
 * Connects to backend AI endpoints for predictions, indicators,
 * correlation analysis, ATH tracking, and swap suggestions.
 */

import { apiClient } from './api'

// Types
export interface ATHAnalysis {
  symbol: string
  current_price: number
  ath_price: number
  ath_date: string
  distance_from_ath_percent: number
  potential_upside_percent: number
  recovery_percent: number
  zone: 'ATH_ZONE' | 'STRONG' | 'RECOVERING' | 'WEAK' | 'CAPITULATION'
  zone_color: string
  days_since_ath: number
  at_ath: boolean
  ath_known: boolean
  message: string | null
  insights: { type: string; message: string }[]
}

export interface PortfolioATHResult {
  assets: ATHAnalysis[]
  portfolio_summary: {
    total_current_value: number
    total_potential_at_ath: number
    portfolio_potential_upside_percent: number
  }
  best_opportunities: ATHAnalysis[]
  analyzed_at: string
}

export interface CorrelationResult {
  symbols: string[]
  matrix: Record<string, Record<string, number>>
  high_correlations: { pair: string[]; correlation: number }[]
  low_correlations: { pair: string[]; correlation: number }[]
  insights: { type: string; title: string; message: string; severity: string }[]
  lookback_days: number
  data_points: number
  calculated_at: string
}

export interface SwapSuggestion {
  id: string
  type: string
  reason: string
  from_symbol: string
  to_symbol: string
  suggested_amount_usd: number
  priority: number
  message: string
  impact: string
}

export interface SwapSuggestionsResult {
  suggestions: SwapSuggestion[]
  current_allocations: Record<string, number>
  target_allocations: Record<string, number>
  summary: {
    total_suggestions: number
    high_priority_count: number
    medium_priority_count: number
    total_suggested_swap_value: number
    portfolio_balance_score: number
    health_status: 'HEALTHY' | 'MODERATE' | 'NEEDS_ATTENTION'
  }
  generated_at: string
}

export interface TechnicalIndicators {
  symbol: string
  indicators: {
    momentum: {
      rsi: { value: number; signal: string; strength: number }
      stochastic: { k: number; d: number; signal: string }
    }
    trend: {
      sma: { sma_20: number | null; sma_50: number | null; sma_200: number | null }
      ema: { ema_9: number | null; ema_21: number | null }
      macd: { macd: number; signal: number; histogram: number; trend: string }
    }
    volatility: {
      bollinger: { upper: number; middle: number; lower: number; position: number; signal: string }
      atr: { value: number; percent: number }
    }
    volume: {
      obv: { value: number; trend: string }
    }
  }
  calculated_at: string
}

export interface PortfolioAsset {
  symbol: string
  amount: number
  current_price: number
  value_usd: number
  cost_basis?: number
}

// API Functions
export const aiService = {
  /**
   * Check AI service health
   */
  async getHealth() {
    const response = await apiClient.get('/ai/health')
    return response.data
  },

  /**
   * Get ATH analysis for a single symbol
   */
  async getATHAnalysis(symbol: string, currentPrice: number): Promise<ATHAnalysis> {
    const response = await apiClient.get(`/ai/ath/${symbol}`, {
      params: { current_price: currentPrice },
    })
    return response.data
  },

  /**
   * Get ATH analysis for entire portfolio
   */
  async getPortfolioATH(portfolio: PortfolioAsset[]): Promise<PortfolioATHResult> {
    const response = await apiClient.post('/ai/ath/portfolio', { portfolio })
    return response.data
  },

  /**
   * Calculate correlation matrix
   */
  async getCorrelation(
    priceData: Record<string, number[]>,
    lookbackDays: number = 30
  ): Promise<CorrelationResult> {
    const response = await apiClient.post('/ai/correlation', {
      price_data: priceData,
      lookback_days: lookbackDays,
    })
    return response.data
  },

  /**
   * Get swap/rebalancing suggestions
   */
  async getSwapSuggestions(
    portfolio: PortfolioAsset[],
    correlationData?: CorrelationResult,
    athData?: PortfolioATHResult,
    customTargets?: Record<string, number>
  ): Promise<SwapSuggestionsResult> {
    const response = await apiClient.post('/ai/swap-suggestions', {
      portfolio: portfolio.map(p => ({
        symbol: p.symbol,
        amount: p.amount,
        current_price: p.current_price,
        value_usd: p.value_usd,
        cost_basis: p.cost_basis,
      })),
      correlation_data: correlationData,
      ath_data: athData,
      custom_targets: customTargets,
    })
    return response.data
  },

  /**
   * Calculate technical indicators
   */
  async getTechnicalIndicators(
    symbol: string,
    ohlcvData: {
      open: number[]
      high: number[]
      low: number[]
      close: number[]
      volume: number[]
    }
  ): Promise<TechnicalIndicators> {
    const response = await apiClient.post('/ai/indicators', {
      symbol,
      ohlcv_data: ohlcvData,
    })
    return response.data
  },

  /**
   * Get trading signals
   */
  async getSignals(symbol: string) {
    const response = await apiClient.get(`/ai/signals/${symbol}`)
    return response.data
  },

  /**
   * Get model accuracy report
   */
  async getAccuracyReport(modelVersion: string = 'v1.0', days: number = 30) {
    const response = await apiClient.get('/ai/accuracy', {
      params: { model_version: modelVersion, days },
    })
    return response.data
  },

  /**
   * Get accuracy trend
   */
  async getAccuracyTrend(modelVersion: string = 'v1.0', days: number = 90) {
    const response = await apiClient.get('/ai/accuracy/trend', {
      params: { model_version: modelVersion, days },
    })
    return response.data
  },

  // ====================
  // Market Data - Real Data from APIs
  // ====================

  /**
   * Get historical price data for correlation analysis
   */
  async getPriceHistory(
    symbols: string[],
    days: number = 30
  ): Promise<{
    symbols: string[]
    price_history: Record<string, number[]>
    days: number
    data_points: number
    fetched_at: string
  }> {
    const response = await apiClient.get('/ai/market/price-history', {
      params: { symbols: symbols.join(','), days },
    })
    return response.data
  },

  /**
   * Get OHLCV data for technical indicators
   */
  async getOHLCV(
    symbol: string,
    interval: string = '1d',
    limit: number = 100
  ): Promise<{
    symbol: string
    interval: string
    data_points: number
    ohlcv: {
      open: number[]
      high: number[]
      low: number[]
      close: number[]
      volume: number[]
      timestamps: number[]
    }
    fetched_at: string
  }> {
    const response = await apiClient.get(`/ai/market/ohlcv/${symbol}`, {
      params: { interval, limit },
    })
    return response.data
  },

  /**
   * Get real ATH data from CoinGecko
   */
  async getRealATH(symbol: string): Promise<{
    symbol: string
    name: string
    current_price: number
    ath: number
    ath_date: string
    ath_change_percentage: number
    atl: number
    atl_date: string
    fetched_at: string
  }> {
    const response = await apiClient.get(`/ai/market/ath/${symbol}`)
    return response.data
  },
}

export default aiService
