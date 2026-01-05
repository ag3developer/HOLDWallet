/**
 * 🛡️ HOLD Wallet - Admin Users Hooks
 * ====================================
 *
 * Hooks com cache para gestão de usuários no admin.
 * Usa React Query para caching e revalidação automática.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUsers,
  getUserById,
  updateUser,
  blockUser,
  unblockUser,
  resetUserPassword,
  disable2FA,
  setAdminStatus,
  type UserListParams,
  type User,
} from '@/services/admin/adminService'

// Query Keys para cache
export const adminUsersKeys = {
  all: ['admin', 'users'] as const,
  lists: () => [...adminUsersKeys.all, 'list'] as const,
  list: (params: UserListParams) => [...adminUsersKeys.lists(), params] as const,
  details: () => [...adminUsersKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminUsersKeys.details(), id] as const,
}

/**
 * Hook para listar usuários com cache
 */
export function useUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: adminUsersKeys.list(params),
    queryFn: async () => {
      const response = await getUsers(params)
      return {
        users: response.items ?? response.users ?? [],
        total: response.total,
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

/**
 * Hook para obter um usuário específico com cache
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: adminUsersKeys.detail(userId),
    queryFn: async () => {
      const response = await getUserById(userId)
      return response.data ?? response
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minuto
  })
}

/**
 * Hook para atualizar um usuário
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<User> }) =>
      updateUser(userId, data),
    onSuccess: (_, variables) => {
      // Invalida cache do usuário específico e da lista
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.detail(variables.userId) })
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.lists() })
    },
  })
}

/**
 * Hook para bloquear um usuário
 */
export function useBlockUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      blockUser(userId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.detail(variables.userId) })
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.lists() })
    },
  })
}

/**
 * Hook para desbloquear um usuário
 */
export function useUnblockUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.detail(userId) })
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.lists() })
    },
  })
}

/**
 * Hook para resetar senha de um usuário
 */
export function useResetUserPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => resetUserPassword(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.detail(userId) })
    },
  })
}

/**
 * Hook para desabilitar 2FA de um usuário
 */
export function useDisable2FA() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => disable2FA(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.detail(userId) })
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.lists() })
    },
  })
}

/**
 * Hook para definir status de admin
 */
export function useSetAdminStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      setAdminStatus(userId, isAdmin),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.detail(variables.userId) })
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.lists() })
    },
  })
}
