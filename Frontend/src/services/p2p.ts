import { P2POrder, Trade, PaymentMethod, ApiResponse, PaginatedResponse, PublicUser } from '@/types'
import { apiClient } from './api'

interface CreateOrderRequest {
  type: 'buy' | 'sell'
  coin: string
  amount: string
  price: string
  minAmount: string
  maxAmount: string
  paymentMethods: string[]
  terms?: string
  autoReply?: string
  timeLimit: number
}

interface OrderFilters {
  type?: 'buy' | 'sell'
  coin?: string
  paymentMethod?: string
  minAmount?: string
  maxAmount?: string
  minPrice?: string
  maxPrice?: string
  country?: string
  verified?: boolean
  online?: boolean
}

interface TradeFilters {
  status?: string
  type?: 'buyer' | 'seller'
  coin?: string
  startDate?: string
  endDate?: string
}

interface StartTradeRequest {
  orderId: string
  amount: string
  paymentMethodId: string
  message?: string
}

interface SendTradeMessageRequest {
  tradeId: string
  message: string
  type?: 'text' | 'payment_proof'
  attachments?: File[]
}

class P2PService {
  // Get all active orders
  async getOrders(page = 1, limit = 20, filters?: OrderFilters): Promise<PaginatedResponse<P2POrder>> {
    const params = { page: page.toString(), limit: limit.toString(), ...filters }
    const response = await apiClient.get<PaginatedResponse<P2POrder>>('/p2p/orders', { params })
    return response.data
  }

  // Get user's orders
  async getMyOrders(page = 1, limit = 20, status?: string): Promise<PaginatedResponse<P2POrder>> {
    const params: Record<string, string> = { page: page.toString(), limit: limit.toString() }
    if (status) params.status = status
    const response = await apiClient.get<PaginatedResponse<P2POrder>>('/p2p/my-orders', { params })
    return response.data
  }

  // Get specific order
  async getOrder(orderId: string): Promise<P2POrder> {
    const response = await apiClient.get<ApiResponse<P2POrder>>(`/p2p/orders/${orderId}`)
    return response.data.data
  }

  // Create new order
  async createOrder(orderData: CreateOrderRequest): Promise<P2POrder> {
    const response = await apiClient.post<ApiResponse<P2POrder>>('/p2p/orders', orderData)
    return response.data.data
  }

  // Update order
  async updateOrder(orderId: string, updates: Partial<CreateOrderRequest>): Promise<P2POrder> {
    const response = await apiClient.put<ApiResponse<P2POrder>>(`/p2p/orders/${orderId}`, updates)
    return response.data.data
  }

  // Delete/Cancel order
  async cancelOrder(orderId: string): Promise<void> {
    await apiClient.delete(`/p2p/orders/${orderId}`)
  }

  // Toggle order status (active/inactive)
  async toggleOrderStatus(orderId: string): Promise<P2POrder> {
    const response = await apiClient.post<ApiResponse<P2POrder>>(`/p2p/orders/${orderId}/toggle`)
    return response.data.data
  }

  // Start a trade
  async startTrade(tradeData: StartTradeRequest): Promise<Trade> {
    const response = await apiClient.post<ApiResponse<Trade>>('/p2p/trades', tradeData)
    return response.data.data
  }

  // Get user's trades
  async getTrades(page = 1, limit = 20, filters?: TradeFilters): Promise<PaginatedResponse<Trade>> {
    const params = { page: page.toString(), limit: limit.toString(), ...filters }
    const response = await apiClient.get<PaginatedResponse<Trade>>('/p2p/trades', { params })
    return response.data
  }

  // Get specific trade
  async getTrade(tradeId: string): Promise<Trade> {
    const response = await apiClient.get<ApiResponse<Trade>>(`/p2p/trades/${tradeId}`)
    return response.data.data
  }

  // Accept trade (seller)
  async acceptTrade(tradeId: string): Promise<Trade> {
    const response = await apiClient.post<ApiResponse<Trade>>(`/p2p/trades/${tradeId}/accept`)
    return response.data.data
  }

  // Mark payment as sent (buyer)
  async markPaymentSent(tradeId: string, message?: string): Promise<Trade> {
    const response = await apiClient.post<ApiResponse<Trade>>(`/p2p/trades/${tradeId}/payment-sent`, {
      message
    })
    return response.data.data
  }

  // Confirm payment received (seller)
  async confirmPaymentReceived(tradeId: string): Promise<Trade> {
    const response = await apiClient.post<ApiResponse<Trade>>(`/p2p/trades/${tradeId}/payment-confirmed`)
    return response.data.data
  }

  // Release escrow (seller)
  async releaseEscrow(tradeId: string): Promise<Trade> {
    const response = await apiClient.post<ApiResponse<Trade>>(`/p2p/trades/${tradeId}/release`)
    return response.data.data
  }

  // Cancel trade
  async cancelTrade(tradeId: string, reason: string): Promise<Trade> {
    const response = await apiClient.post<ApiResponse<Trade>>(`/p2p/trades/${tradeId}/cancel`, {
      reason
    })
    return response.data.data
  }

  // Dispute trade
  async disputeTrade(tradeId: string, reason: string, description: string, evidence?: File[]): Promise<Trade> {
    const formData = new FormData()
    formData.append('reason', reason)
    formData.append('description', description)
    
    if (evidence) {
      evidence.forEach((file, index) => {
        formData.append(`evidence_${index}`, file)
      })
    }

    const response = await apiClient.post<ApiResponse<Trade>>(`/p2p/trades/${tradeId}/dispute`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data.data
  }

  // Send trade message
  async sendTradeMessage(messageData: SendTradeMessageRequest): Promise<void> {
    if (messageData.attachments && messageData.attachments.length > 0) {
      const formData = new FormData()
      formData.append('message', messageData.message)
      formData.append('type', messageData.type || 'text')
      
      messageData.attachments.forEach((file, index) => {
        formData.append(`attachments_${index}`, file)
      })

      await apiClient.post(`/p2p/trades/${messageData.tradeId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    } else {
      await apiClient.post(`/p2p/trades/${messageData.tradeId}/messages`, {
        message: messageData.message,
        type: messageData.type || 'text'
      })
    }
  }

  // Get trade messages
  async getTradeMessages(tradeId: string): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(`/p2p/trades/${tradeId}/messages`)
    return response.data.data
  }

  // Get user's payment methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await apiClient.get<ApiResponse<PaymentMethod[]>>('/p2p/payment-methods')
    return response.data.data
  }

  // Create payment method
  async createPaymentMethod(paymentMethodData: {
    name: string
    type: string
    details: Record<string, any>
  }): Promise<PaymentMethod> {
    const response = await apiClient.post<ApiResponse<PaymentMethod>>('/p2p/payment-methods', paymentMethodData)
    return response.data.data
  }

  // Update payment method
  async updatePaymentMethod(methodId: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod> {
    const response = await apiClient.put<ApiResponse<PaymentMethod>>(`/p2p/payment-methods/${methodId}`, updates)
    return response.data.data
  }

  // Delete payment method
  async deletePaymentMethod(methodId: string): Promise<void> {
    await apiClient.delete(`/p2p/payment-methods/${methodId}`)
  }

  // Get user profile for P2P
  async getUserProfile(userId: string): Promise<PublicUser> {
    const response = await apiClient.get<ApiResponse<PublicUser>>(`/p2p/users/${userId}`)
    return response.data.data
  }

  // Get user's feedback/reviews
  async getUserFeedback(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    const params = { page: page.toString(), limit: limit.toString() }
    const response = await apiClient.get<PaginatedResponse<any>>(`/p2p/users/${userId}/feedback`, { params })
    return response.data
  }

  // Leave feedback for trade partner
  async leaveFeedback(tradeId: string, rating: number, comment: string, type: 'positive' | 'neutral' | 'negative'): Promise<void> {
    await apiClient.post(`/p2p/trades/${tradeId}/feedback`, {
      rating,
      comment,
      type
    })
  }

  // Get market statistics
  async getMarketStats(coin?: string): Promise<{
    totalVolume24h: string
    totalTrades24h: number
    averagePrice: string
    priceChange24h: string
    buyOrders: number
    sellOrders: number
    topTraders: PublicUser[]
  }> {
    const params = coin ? { coin } : {}
    const response = await apiClient.get<ApiResponse<any>>('/p2p/market-stats', { params })
    return response.data.data
  }

  // Get price suggestions based on current market
  async getPriceSuggestions(coin: string, type: 'buy' | 'sell', amount: string): Promise<{
    suggested: string
    min: string
    max: string
    avg: string
    median: string
  }> {
    const response = await apiClient.get<ApiResponse<any>>('/p2p/price-suggestions', {
      params: { coin, type, amount }
    })
    return response.data.data
  }

  // Get recent trades for a coin pair
  async getRecentTrades(coin: string, limit = 10): Promise<{
    amount: string
    price: string
    type: 'buy' | 'sell'
    timestamp: string
  }[]> {
    const response = await apiClient.get<ApiResponse<any>>(`/p2p/recent-trades/${coin}`, {
      params: { limit: limit.toString() }
    })
    return response.data.data
  }
}

export const p2pService = new P2PService()
