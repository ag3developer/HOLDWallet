/**
 * 🛡️ HOLD Wallet - Admin Trades Hooks
 * =====================================
 *
 * Hooks com cache para gestão de trades no admin.
 * Usa React Query para caching e revalidação automática.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTrades,
  getTradeStats,
  getTradeById,
  cancelTrade,
  updateTradeStatus,
  confirmTradePayment,
  retryTradeDeposit,
  sendToAccounting,
  getTradeAccountingEntries,
  type TradeListParams,
  type UpdateTradeStatusRequest,
  type ConfirmPaymentRequest,
} from '@/services/admin/adminService'

// Query Keys para cache
export const adminTradesKeys = {
  all: ['admin', 'trades'] as const,
  stats: () => [...adminTradesKeys.all, 'stats'] as const,
  lists: () => [...adminTradesKeys.all, 'list'] as const,
  list: (params: TradeListParams) => [...adminTradesKeys.lists(), params] as const,
  details: () => [...adminTradesKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminTradesKeys.details(), id] as const,
}

/**
 * Hook para estatísticas de trades com cache
 */
export function useTradeStats() {
  return useQuery({
    queryKey: adminTradesKeys.stats(),
    queryFn: async () => {
      const response = await getTradeStats()
      if (response.success) {
        return response.data
      }
      throw new Error('Erro ao buscar estatísticas')
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

/**
 * Hook para listar trades com cache
 */
export function useTrades(params: TradeListParams = {}) {
  return useQuery({
    queryKey: adminTradesKeys.list(params),
    queryFn: async () => {
      const response = await getTrades(params)
      if (response.success) {
        return response.data
      }
      throw new Error('Erro ao buscar trades')
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
  })
}

/**
 * Hook para obter um trade específico com cache
 */
export function useTrade(tradeId: string) {
  return useQuery({
    queryKey: adminTradesKeys.detail(tradeId),
    queryFn: async () => {
      const response = await getTradeById(tradeId)
      if (response.success) {
        return response.data
      }
      throw new Error('Erro ao buscar trade')
    },
    enabled: !!tradeId,
    staleTime: 30 * 1000, // 30 segundos
  })
}

/**
 * Hook para cancelar um trade
 */
export function useCancelTrade() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tradeId, reason }: { tradeId: string; reason?: string }) =>
      cancelTrade(tradeId, reason),
    onSuccess: (_, variables) => {
      // Invalida cache do trade específico, lista e stats
      queryClient.invalidateQueries({ queryKey: adminTradesKeys.detail(variables.tradeId) })
      queryClient.invalidateQueries({ queryKey: adminTradesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: adminTradesKeys.stats() })
    },
  })
}

/**
 * Hook para atualizar status de um trade
 */
export function useUpdateTradeStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tradeId, data }: { tradeId: string; data: UpdateTradeStatusRequest }) =>
      updateTradeStatus(tradeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminTradesKeys.detail(variables.tradeId) })
      queryClient.invalidateQueries({ queryKey: adminTradesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: adminTradesKeys.stats() })
    },
  })
}

/**
 * Hook para confirmar pagamento e iniciar depósito
 */
export function useConfirmTradePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tradeId, data }: { tradeId: string; data?: ConfirmPaymentRequest }) =>
      confirmTradePayment(tradeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminTradesKeys.detail(variables.tradeId) })
      queryClient.invalidateQueries({ queryKey: adminTradesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: adminTradesKeys.stats() })
    },
  })
}

/**
 * Hook para retry de depósito
 */
export function useRetryTradeDeposit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tradeId, network }: { tradeId: string; network?: string }) =>
      retryTradeDeposit(tradeId, network),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminTradesKeys.detail(variables.tradeId) })
      queryClient.invalidateQueries({ queryKey: adminTradesKeys.lists() })
    },
  })
}

/**
 * Hook para enviar para contabilidade
 */
export function useSendToAccounting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tradeId: string) => sendToAccounting(tradeId),
    onSuccess: (_, tradeId) => {
      queryClient.invalidateQueries({ queryKey: adminTradesKeys.detail(tradeId) })
    },
  })
}

/**
 * Hook para buscar entradas contábeis de um trade
 */
export function useTradeAccountingEntries(tradeId: string) {
  return useQuery({
    queryKey: [...adminTradesKeys.detail(tradeId), 'accounting'],
    queryFn: async () => {
      const response = await getTradeAccountingEntries(tradeId)
      if (response.success) {
        return response.data
      }
      throw new Error('Erro ao buscar entradas contábeis')
    },
    enabled: !!tradeId,
    staleTime: 60 * 1000, // 1 minuto
  })
}
