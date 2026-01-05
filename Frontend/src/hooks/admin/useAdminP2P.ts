/**
 * 🛡️ HOLD Wallet - Admin P2P Hooks
 * =================================
 *
 * Hooks com cache para gestão de P2P no admin.
 * Usa React Query para caching e revalidação automática.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getP2POrders,
  getP2PDisputes,
  getP2PStats,
  pauseP2POrder,
  activateP2POrder,
  resolveP2PDispute,
  type P2POrderListParams,
  type P2PDisputeListParams,
} from '@/services/admin/adminService'

// Query Keys para cache
export const adminP2PKeys = {
  all: ['admin', 'p2p'] as const,
  stats: () => [...adminP2PKeys.all, 'stats'] as const,
  orders: () => [...adminP2PKeys.all, 'orders'] as const,
  ordersList: (params: P2POrderListParams) => [...adminP2PKeys.orders(), params] as const,
  disputes: () => [...adminP2PKeys.all, 'disputes'] as const,
  disputesList: (params: P2PDisputeListParams) => [...adminP2PKeys.disputes(), params] as const,
}

/**
 * Hook para estatísticas P2P com cache
 */
export function useP2PStats() {
  return useQuery({
    queryKey: adminP2PKeys.stats(),
    queryFn: async () => {
      const response = await getP2PStats()
      if (response.success) {
        return response.data
      }
      throw new Error('Erro ao buscar estatísticas')
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

/**
 * Hook para listar ordens P2P com cache
 */
export function useP2POrders(params: P2POrderListParams = {}) {
  return useQuery({
    queryKey: adminP2PKeys.ordersList(params),
    queryFn: async () => {
      const response = await getP2POrders(params)
      if (response.success) {
        return response.data
      }
      throw new Error('Erro ao buscar ordens')
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
  })
}

/**
 * Hook para listar disputas P2P com cache
 */
export function useP2PDisputes(params: P2PDisputeListParams = {}) {
  return useQuery({
    queryKey: adminP2PKeys.disputesList(params),
    queryFn: async () => {
      const response = await getP2PDisputes(params)
      if (response.success) {
        return response.data
      }
      throw new Error('Erro ao buscar disputas')
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
  })
}

/**
 * Hook para pausar uma ordem P2P
 */
export function usePauseP2POrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) => pauseP2POrder(orderId),
    onSuccess: () => {
      // Invalida cache de ordens e stats após pausar
      queryClient.invalidateQueries({ queryKey: adminP2PKeys.orders() })
      queryClient.invalidateQueries({ queryKey: adminP2PKeys.stats() })
    },
  })
}

/**
 * Hook para ativar uma ordem P2P
 */
export function useActivateP2POrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) => activateP2POrder(orderId),
    onSuccess: () => {
      // Invalida cache de ordens e stats após ativar
      queryClient.invalidateQueries({ queryKey: adminP2PKeys.orders() })
      queryClient.invalidateQueries({ queryKey: adminP2PKeys.stats() })
    },
  })
}

/**
 * Hook para resolver uma disputa P2P
 */
export function useResolveP2PDispute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      disputeId,
      data,
    }: {
      disputeId: string
      data: { resolution: 'buyer_wins' | 'seller_wins' | 'split'; notes?: string }
    }) => resolveP2PDispute(disputeId, data),
    onSuccess: () => {
      // Invalida cache de disputas e stats após resolver
      queryClient.invalidateQueries({ queryKey: adminP2PKeys.disputes() })
      queryClient.invalidateQueries({ queryKey: adminP2PKeys.stats() })
    },
  })
}
