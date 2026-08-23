/**
 * 👤 Account Deletion Hook
 * =======================
 *
 * Hook para gerenciar exclusão de conta com integração de API
 * - Solicitar exclusão
 * - Confirmar exclusão
 * - Cancelar exclusão
 * - Verificar status
 * - Exportar dados
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'

interface DeletionRequest {
  deletion_type: 'soft' | 'hard' | 'scheduled'
  password: string
  reason?: string
}

interface DeletionConfirmation {
  confirmation_code: string
}

interface DeletionStatus {
  deletion_id: string
  status: string
  deletion_type: string
  requested_at: string
  confirmed_at?: string
  scheduled_deletion_date?: string
  token_expires_at: string
}

interface ExportData {
  format: 'pdf' | 'excel' | 'json'
  send_to_email?: boolean
}

/**
 * Hook para solicitar exclusão de conta
 */
export const useRequestAccountDeletion = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: DeletionRequest) => {
      const response = await apiClient.post('/account/delete-request', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'deletion-status'] })
    },
  })
}

/**
 * Hook para confirmar exclusão de conta
 */
export const useConfirmAccountDeletion = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      deletion_id,
      confirmation_code,
    }: {
      deletion_id: string
      confirmation_code: string
    }) => {
      const response = await apiClient.post(`/account/delete-confirm/${deletion_id}`, {
        confirmation_code,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'deletion-status'] })
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

/**
 * Hook para cancelar exclusão de conta
 */
export const useCancelAccountDeletion = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (deletion_id: string) => {
      const response = await apiClient.post(`/account/delete-cancel/${deletion_id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'deletion-status'] })
    },
  })
}

/**
 * Hook para obter status de exclusão
 */
export const useAccountDeletionStatus = (deletion_id?: string) => {
  return useQuery({
    queryKey: ['account', 'deletion-status', deletion_id],
    queryFn: async () => {
      if (!deletion_id) return null
      const response = await apiClient.get<DeletionStatus>(`/account/delete-status/${deletion_id}`)
      return response.data
    },
    enabled: !!deletion_id,
  })
}

/**
 * Hook para exportar dados da conta
 */
export const useExportAccountData = () => {
  return useMutation({
    mutationFn: async (data: ExportData) => {
      const response = await apiClient.post('/account/export', data, {
        responseType: data.format === 'json' ? 'json' : 'blob',
      })
      return response
    },
  })
}

/**
 * Hook para obter perfil da conta
 */
export const useAccountProfile = () => {
  return useQuery({
    queryKey: ['account', 'profile'],
    queryFn: async () => {
      const response = await apiClient.get('/account/profile')
      return response.data
    },
  })
}
