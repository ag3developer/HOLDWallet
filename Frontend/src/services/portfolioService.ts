/**
 * Portfolio Service
 * Manages user portfolio with cost basis tracking and P&L calculations
 */

import { apiClient } from './api'

export interface PortfolioAsset {
  symbol: string
  network?: string
  amount: number
  current_price: number
  value_usd: number
  cost_basis: number
  total_invested: number
  pnl_amount: number
  pnl_percent: number
  last_updated?: string
}

export interface PortfolioSummary {
  total_value_usd: number
  total_invested: number
  total_pnl_amount: number
  total_pnl_percent: number
  asset_count: number
  profitable_count: number
  losing_count: number
}

export interface PortfolioResponse {
  assets: PortfolioAsset[]
  summary: PortfolioSummary
}

export interface BuyRequest {
  symbol: string
  amount: number
  price_usd: number
  network?: string
}

export interface SellRequest {
  symbol: string
  amount: number
}

export interface SyncBalancesRequest {
  balances: Record<string, number>
}

class PortfolioService {
  /**
   * Get user's portfolio with P&L calculations
   */
  async getPortfolio(): Promise<PortfolioResponse> {
    try {
      console.log('[PortfolioService] 📊 Fetching portfolio with P&L...')
      const response = await apiClient.get<PortfolioResponse>('/portfolio/holdings')
      console.log('[PortfolioService] ✅ Portfolio received:', response.data)
      return response.data
    } catch (error: any) {
      console.error('[PortfolioService] ❌ Error fetching portfolio:', error)
      // Return empty portfolio on error
      return {
        assets: [],
        summary: {
          total_value_usd: 0,
          total_invested: 0,
          total_pnl_amount: 0,
          total_pnl_percent: 0,
          asset_count: 0,
          profitable_count: 0,
          losing_count: 0,
        },
      }
    }
  }

  /**
   * Get portfolio summary only (faster)
   */
  async getSummary(): Promise<PortfolioSummary> {
    try {
      const response = await apiClient.get<PortfolioSummary>('/portfolio/holdings/summary')
      return response.data
    } catch (error: any) {
      console.error('[PortfolioService] ❌ Error fetching summary:', error)
      return {
        total_value_usd: 0,
        total_invested: 0,
        total_pnl_amount: 0,
        total_pnl_percent: 0,
        asset_count: 0,
        profitable_count: 0,
        losing_count: 0,
      }
    }
  }

  /**
   * Record a buy transaction
   */
  async recordBuy(request: BuyRequest): Promise<PortfolioAsset | null> {
    try {
      console.log('[PortfolioService] 💰 Recording buy:', request)
      const response = await apiClient.post<PortfolioAsset>('/portfolio/holdings/buy', request)
      console.log('[PortfolioService] ✅ Buy recorded:', response.data)
      return response.data
    } catch (error: any) {
      console.error('[PortfolioService] ❌ Error recording buy:', error)
      return null
    }
  }

  /**
   * Record a sell transaction
   */
  async recordSell(request: SellRequest): Promise<boolean> {
    try {
      console.log('[PortfolioService] 💸 Recording sell:', request)
      await apiClient.post('/portfolio/holdings/sell', request)
      console.log('[PortfolioService] ✅ Sell recorded')
      return true
    } catch (error: any) {
      console.error('[PortfolioService] ❌ Error recording sell:', error)
      return false
    }
  }

  /**
   * Sync portfolio with wallet balances
   * New assets will use current price as cost basis
   */
  async syncWithBalances(balances: Record<string, number>): Promise<boolean> {
    try {
      console.log('[PortfolioService] 🔄 Syncing with balances:', balances)
      await apiClient.post('/portfolio/holdings/sync', { balances })
      console.log('[PortfolioService] ✅ Portfolio synced')
      return true
    } catch (error: any) {
      console.error('[PortfolioService] ❌ Error syncing portfolio:', error)
      return false
    }
  }

  /**
   * Update cost basis manually (for imported wallets)
   */
  async updateCostBasis(symbol: string, costBasis: number): Promise<boolean> {
    try {
      console.log('[PortfolioService] ✏️ Updating cost basis:', symbol, costBasis)
      await apiClient.put('/portfolio/holdings/cost-basis', {
        symbol,
        cost_basis: costBasis,
      })
      console.log('[PortfolioService] ✅ Cost basis updated')
      return true
    } catch (error: any) {
      console.error('[PortfolioService] ❌ Error updating cost basis:', error)
      return false
    }
  }

  /**
   * Convert portfolio to AI service format
   */
  toAIFormat(portfolio: PortfolioResponse): Array<{
    symbol: string
    amount: number
    current_price: number
    value_usd: number
    cost_basis: number
  }> {
    return portfolio.assets.map(asset => ({
      symbol: asset.symbol,
      amount: asset.amount,
      current_price: asset.current_price,
      value_usd: asset.value_usd,
      cost_basis: asset.cost_basis,
    }))
  }
}

export const portfolioService = new PortfolioService()
export default portfolioService
