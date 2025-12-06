/**
 * 💱 useP2PTrades Hook
 * ====================
 * 
 * React Query hooks for managing P2P trades (active transactions)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { p2pService } from '@/services/p2p'
import { useToast } from '@/hooks/useToast'
import type { Trade } from '@/types'

interface TradeFilters {
  status?: string
  type?: 'buyer' | 'seller'
  coin?: string
  startDate?: string
  endDate?: string
}

/**
 * Fetch user's trades
 */
export function useP2PTrades(filters?: TradeFilters, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['p2p-trades', filters, page],
    queryFn: () => p2pService.getTrades(page, limit, filters),
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

/**
 * Fetch specific trade by ID
 */
export function useP2PTrade(tradeId: string) {
  return useQuery({
    queryKey: ['p2p-trade', tradeId],
    queryFn: () => p2pService.getTrade(tradeId),
    enabled: !!tradeId,
    staleTime: 10000, // 10 seconds - trades change frequently
    refetchInterval: 15000, // Refetch every 15 seconds
  })
}

/**
 * Start a new trade (respond to an order)
 */
export function useStartTrade() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: p2pService.startTrade,
    onSuccess: (newTrade) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['p2p-trades'] })
      queryClient.invalidateQueries({ queryKey: ['p2p-orders'] })
      
      showToast('Trade iniciado com sucesso!', 'success')
      
      // Return trade for navigation
      return newTrade
    },
    onError: (error: any) => {
      console.error('Failed to start trade:', error)
      showToast(
        error?.response?.data?.detail || 'Erro ao iniciar trade. Tente novamente.',
        'error'
      )
    }
  })
}

/**
 * Accept trade (seller accepts buyer's request)
 */
export function useAcceptTrade() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: p2pService.acceptTrade,
    onSuccess: (updatedTrade) => {
      queryClient.setQueryData(['p2p-trade', updatedTrade.id], updatedTrade)
      queryClient.invalidateQueries({ queryKey: ['p2p-trades'] })
      
      showToast('Trade aceito! Aguardando pagamento do comprador.', 'success')
    },
    onError: (error: any) => {
      console.error('Failed to accept trade:', error)
      showToast('Erro ao aceitar trade', 'error')
    }
  })
}

/**
 * Mark payment as sent (buyer confirms payment)
 */
export function useMarkPaymentSent() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: ({ tradeId, message }: { tradeId: string; message?: string }) =>
      p2pService.markPaymentSent(tradeId, message),
    onSuccess: (updatedTrade) => {
      queryClient.setQueryData(['p2p-trade', updatedTrade.id], updatedTrade)
      queryClient.invalidateQueries({ queryKey: ['p2p-trades'] })
      
      showToast('Pagamento marcado como enviado! Aguarde confirmação do vendedor.', 'success')
    },
    onError: (error: any) => {
      console.error('Failed to mark payment as sent:', error)
      showToast('Erro ao confirmar pagamento enviado', 'error')
    }
  })
}

/**
 * Confirm payment received (seller confirms)
 */
export function useConfirmPaymentReceived() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: p2pService.confirmPaymentReceived,
    onSuccess: (updatedTrade) => {
      queryClient.setQueryData(['p2p-trade', updatedTrade.id], updatedTrade)
      queryClient.invalidateQueries({ queryKey: ['p2p-trades'] })
      
      showToast('Pagamento confirmado! Liberando criptomoeda...', 'success')
    },
    onError: (error: any) => {
      console.error('Failed to confirm payment:', error)
      showToast('Erro ao confirmar recebimento do pagamento', 'error')
    }
  })
}

/**
 * Release escrow (seller releases crypto to buyer)
 */
export function useReleaseEscrow() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: p2pService.releaseEscrow,
    onSuccess: (updatedTrade) => {
      queryClient.setQueryData(['p2p-trade', updatedTrade.id], updatedTrade)
      queryClient.invalidateQueries({ queryKey: ['p2p-trades'] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      
      showToast('✅ Trade concluído! Criptomoeda liberada com sucesso.', 'success')
    },
    onError: (error: any) => {
      console.error('Failed to release escrow:', error)
      showToast('Erro ao liberar escrow', 'error')
    }
  })
}

/**
 * Cancel trade
 */
export function useCancelTrade() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: ({ tradeId, reason }: { tradeId: string; reason: string }) =>
      p2pService.cancelTrade(tradeId, reason),
    onSuccess: (updatedTrade) => {
      queryClient.setQueryData(['p2p-trade', updatedTrade.id], updatedTrade)
      queryClient.invalidateQueries({ queryKey: ['p2p-trades'] })
      
      showToast('Trade cancelado', 'info')
    },
    onError: (error: any) => {
      console.error('Failed to cancel trade:', error)
      showToast('Erro ao cancelar trade', 'error')
    }
  })
}

/**
 * Open dispute
 */
export function useDisputeTrade() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: ({ tradeId, reason, description, evidence }: {
      tradeId: string
      reason: string
      description: string
      evidence?: File[]
    }) => p2pService.disputeTrade(tradeId, reason, description, evidence),
    onSuccess: (updatedTrade) => {
      queryClient.setQueryData(['p2p-trade', updatedTrade.id], updatedTrade)
      queryClient.invalidateQueries({ queryKey: ['p2p-trades'] })
      
      showToast('Disputa aberta. Nossa equipe irá analisar em breve.', 'warning')
    },
    onError: (error: any) => {
      console.error('Failed to open dispute:', error)
      showToast('Erro ao abrir disputa', 'error')
    }
  })
}

/**
 * Send trade message
 */
export function useSendTradeMessage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: p2pService.sendTradeMessage,
    onSuccess: (_, variables) => {
      // Invalidate messages for this trade
      queryClient.invalidateQueries({ queryKey: ['trade-messages', variables.tradeId] })
    },
    onError: (error: any) => {
      console.error('Failed to send message:', error)
    }
  })
}

/**
 * Fetch trade messages
 */
export function useTradeMessages(tradeId: string) {
  return useQuery({
    queryKey: ['trade-messages', tradeId],
    queryFn: () => p2pService.getTradeMessages(tradeId),
    enabled: !!tradeId,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  })
}

/**
 * Leave feedback after trade completion
 */
export function useLeaveFeedback() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: ({ tradeId, rating, comment, type }: {
      tradeId: string
      rating: number
      comment: string
      type: 'positive' | 'neutral' | 'negative'
    }) => p2pService.leaveFeedback(tradeId, rating, comment, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2p-trades'] })
      showToast('Avaliação enviada com sucesso!', 'success')
    },
    onError: (error: any) => {
      console.error('Failed to leave feedback:', error)
      showToast('Erro ao enviar avaliação', 'error')
    }
  })
}
