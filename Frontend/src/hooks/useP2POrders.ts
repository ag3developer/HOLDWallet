/**
 * 🤝 useP2POrders Hook
 * ====================
 * 
 * React Query hooks for managing P2P orders (buy/sell ads)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { p2pService } from '@/services/p2p'
import { useToast } from '@/hooks/useToast'
import type { P2POrder } from '@/types'

interface OrderFilters {
  type?: 'buy' | 'sell'
  coin?: string
  paymentMethod?: string
  minAmount?: string
  maxAmount?: string
  verified?: boolean
  online?: boolean
}

/**
 * Fetch P2P orders from marketplace
 */
export function useP2POrders(filters?: OrderFilters, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['p2p-orders', filters, page],
    queryFn: () => p2pService.getOrders(page, limit, filters),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
  })
}

/**
 * Fetch user's own orders
 */
export function useMyP2POrders(status?: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['my-p2p-orders', status, page],
    queryFn: () => p2pService.getMyOrders(page, limit, status),
    staleTime: 15000, // 15 seconds
  })
}

/**
 * Fetch specific order by ID
 */
export function useP2POrder(orderId: string) {
  return useQuery({
    queryKey: ['p2p-order', orderId],
    queryFn: () => p2pService.getOrder(orderId),
    enabled: !!orderId,
    staleTime: 30000,
  })
}

/**
 * Create new P2P order
 */
export function useCreateP2POrder() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: p2pService.createOrder,
    onSuccess: (newOrder) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['p2p-orders'] })
      queryClient.invalidateQueries({ queryKey: ['my-p2p-orders'] })
      
      // Show success message
      showToast(
        `Ordem ${newOrder.type === 'buy' ? 'de compra' : 'de venda'} criada com sucesso!`,
        'success'
      )
    },
    onError: (error: any) => {
      console.error('Failed to create order:', error)
      showToast(
        error?.response?.data?.detail || 'Erro ao criar ordem. Tente novamente.',
        'error'
      )
    }
  })
}

/**
 * Update existing order
 */
export function useUpdateP2POrder() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: ({ orderId, updates }: { orderId: string; updates: any }) =>
      p2pService.updateOrder(orderId, updates),
    onSuccess: (updatedOrder) => {
      // Update cache
      queryClient.setQueryData(['p2p-order', updatedOrder.id], updatedOrder)
      queryClient.invalidateQueries({ queryKey: ['p2p-orders'] })
      queryClient.invalidateQueries({ queryKey: ['my-p2p-orders'] })
      
      showToast('Ordem atualizada com sucesso!', 'success')
    },
    onError: (error: any) => {
      console.error('Failed to update order:', error)
      showToast('Erro ao atualizar ordem', 'error')
    }
  })
}

/**
 * Cancel/Delete order
 */
export function useCancelP2POrder() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: p2pService.cancelOrder,
    onSuccess: (_, orderId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['p2p-order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['p2p-orders'] })
      queryClient.invalidateQueries({ queryKey: ['my-p2p-orders'] })
      
      showToast('Ordem cancelada com sucesso', 'success')
    },
    onError: (error: any) => {
      console.error('Failed to cancel order:', error)
      showToast('Erro ao cancelar ordem', 'error')
    }
  })
}

/**
 * Toggle order status (active/inactive)
 */
export function useToggleOrderStatus() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: p2pService.toggleOrderStatus,
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(['p2p-order', updatedOrder.id], updatedOrder)
      queryClient.invalidateQueries({ queryKey: ['p2p-orders'] })
      queryClient.invalidateQueries({ queryKey: ['my-p2p-orders'] })
      
      showToast(
        `Ordem ${updatedOrder.status === 'active' ? 'ativada' : 'desativada'}`,
        'success'
      )
    },
    onError: (error: any) => {
      console.error('Failed to toggle order status:', error)
      showToast('Erro ao alterar status da ordem', 'error')
    }
  })
}

/**
 * Get market statistics
 */
export function useMarketStats(coin?: string) {
  return useQuery({
    queryKey: ['p2p-market-stats', coin],
    queryFn: () => p2pService.getMarketStats(coin),
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  })
}

/**
 * Get price suggestions for creating order
 */
export function usePriceSuggestions(coin: string, type: 'buy' | 'sell', amount: string) {
  return useQuery({
    queryKey: ['price-suggestions', coin, type, amount],
    queryFn: () => p2pService.getPriceSuggestions(coin, type, amount),
    enabled: !!coin && !!amount && parseFloat(amount) > 0,
    staleTime: 30000,
  })
}

/**
 * Get recent trades for a coin
 */
export function useRecentTrades(coin: string, limit = 10) {
  return useQuery({
    queryKey: ['recent-trades', coin, limit],
    queryFn: () => p2pService.getRecentTrades(coin, limit),
    staleTime: 30000,
    refetchInterval: 60000,
  })
}
