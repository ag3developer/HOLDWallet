/**
 * 💳 usePaymentMethods Hook
 * =========================
 * 
 * React Query hooks for managing user's payment methods for P2P trading
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { p2pService } from '@/services/p2p'
import { useToast } from '@/hooks/useToast'
import type { PaymentMethod } from '@/types'

/**
 * Fetch user's payment methods
 */
export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: p2pService.getPaymentMethods,
    staleTime: 300000, // 5 minutes - payment methods don't change often
  })
}

/**
 * Create new payment method
 */
export function useCreatePaymentMethod() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: (paymentMethodData: {
      name: string
      type: string
      details: Record<string, any>
    }) => p2pService.createPaymentMethod(paymentMethodData),
    onSuccess: (newMethod) => {
      // Add to cache
      queryClient.setQueryData<PaymentMethod[]>(['payment-methods'], (old = []) => {
        return [...old, newMethod]
      })
      
      showToast('Método de pagamento adicionado com sucesso!', 'success')
    },
    onError: (error: any) => {
      console.error('Failed to create payment method:', error)
      showToast(
        error?.response?.data?.detail || 'Erro ao adicionar método de pagamento',
        'error'
      )
    }
  })
}

/**
 * Update existing payment method
 */
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: ({ methodId, updates }: {
      methodId: string
      updates: Partial<PaymentMethod>
    }) => p2pService.updatePaymentMethod(methodId, updates),
    onSuccess: (updatedMethod) => {
      // Update in cache
      queryClient.setQueryData<PaymentMethod[]>(['payment-methods'], (old = []) => {
        return old.map(method => 
          method.id === updatedMethod.id ? updatedMethod : method
        )
      })
      
      showToast('Método de pagamento atualizado!', 'success')
    },
    onError: (error: any) => {
      console.error('Failed to update payment method:', error)
      showToast('Erro ao atualizar método de pagamento', 'error')
    }
  })
}

/**
 * Delete payment method
 */
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: p2pService.deletePaymentMethod,
    onSuccess: (_, methodId) => {
      // Remove from cache
      queryClient.setQueryData<PaymentMethod[]>(['payment-methods'], (old = []) => {
        return old.filter(method => method.id !== methodId)
      })
      
      showToast('Método de pagamento removido', 'success')
    },
    onError: (error: any) => {
      console.error('Failed to delete payment method:', error)
      showToast('Erro ao remover método de pagamento', 'error')
    }
  })
}

/**
 * Get user profile for P2P (public info)
 */
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => p2pService.getUserProfile(userId),
    enabled: !!userId,
    staleTime: 300000, // 5 minutes
  })
}

/**
 * Get user's feedback/reviews
 */
export function useUserFeedback(userId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['user-feedback', userId, page],
    queryFn: () => p2pService.getUserFeedback(userId, page, limit),
    enabled: !!userId,
    staleTime: 300000,
  })
}
