/**
 * 🛡️ HOLD Wallet - Admin Transactions Hooks
 * ==========================================
 *
 * React Query hooks para gestão de transações blockchain no admin.
 * Implementa cache inteligente e invalidação automática.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1'

// Helper para obter token
const getAuthToken = () => {
  try {
    const stored = localStorage.getItem('hold-wallet-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.token
    }
  } catch {
    return null
  }
  return null
}

// Helper para requests autenticados
const authFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken()
  if (!token) {
    throw new Error('Token não encontrado')
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }))
    throw new Error(error.detail || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// ============================================
// TIPOS
// ============================================

export interface TransactionStats {
  total: number
  pending: number
  confirmed: number
  failed: number
  last_24h: number
  last_7d: number
  deposits: number
  withdrawals: number
  by_network: Array<{ network: string; count: number }>
}

export interface Transaction {
  id: string
  user_id: string
  username?: string
  email?: string
  tx_type: 'deposit' | 'withdrawal' | 'transfer' | 'buy' | 'sell'
  tx_hash?: string
  from_address?: string
  to_address?: string
  amount: number
  cryptocurrency?: string
  network?: string
  status: 'pending' | 'confirmed' | 'failed'
  fee?: number
  confirmations?: number
  block_number?: number
  error_message?: string
  created_at: string
  updated_at?: string
  confirmed_at?: string
}

interface TransactionsFilters {
  skip?: number
  limit?: number
  status?: string | undefined
  tx_type?: string | undefined
  network?: string | undefined
  user_id?: string | undefined
  search?: string | undefined
}

// ============================================
// QUERY KEYS
// ============================================

export const transactionKeys = {
  all: ['admin', 'transactions'] as const,
  stats: () => [...transactionKeys.all, 'stats'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: TransactionsFilters) => [...transactionKeys.lists(), filters] as const,
  detail: (id: string) => [...transactionKeys.all, 'detail', id] as const,
  userTransactions: (userId: string, txType?: string) =>
    [...transactionKeys.all, 'user', userId, txType] as const,
}

// ============================================
// HOOKS - ESTATÍSTICAS
// ============================================

export function useTransactionStats() {
  return useQuery({
    queryKey: transactionKeys.stats(),
    queryFn: async () => {
      const response = await authFetch('/admin/transactions/stats')
      return response.data as TransactionStats
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false,
  })
}

// ============================================
// HOOKS - LISTAGEM DE TRANSAÇÕES
// ============================================

export function useTransactions(filters: TransactionsFilters = {}) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.skip) params.append('skip', String(filters.skip))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.status) params.append('status_filter', filters.status)
      if (filters.tx_type) params.append('tx_type', filters.tx_type)
      if (filters.network) params.append('network', filters.network)
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.search) params.append('search', filters.search)

      const queryString = params.toString()
      const endpoint = queryString ? `/admin/transactions?${queryString}` : '/admin/transactions'

      const response = await authFetch(endpoint)
      return response.data as {
        items: Transaction[]
        total: number
        skip: number
        limit: number
      }
    },
    staleTime: 1000 * 60, // 1 minuto
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })
}

// ============================================
// HOOKS - DETALHES DA TRANSAÇÃO
// ============================================

export function useTransaction(transactionId: string) {
  return useQuery({
    queryKey: transactionKeys.detail(transactionId),
    queryFn: async () => {
      const response = await authFetch(`/admin/transactions/${transactionId}`)
      return response.data as Transaction
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    enabled: !!transactionId,
  })
}

// ============================================
// HOOKS - TRANSAÇÕES DO USUÁRIO
// ============================================

export function useUserTransactions(userId: string, txType?: string) {
  return useQuery({
    queryKey: transactionKeys.userTransactions(userId, txType),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (txType) params.append('tx_type', txType)

      const queryString = params.toString()
      const endpoint = queryString
        ? `/admin/transactions/user/${userId}?${queryString}`
        : `/admin/transactions/user/${userId}`

      const response = await authFetch(endpoint)
      return response.data as {
        user: { id: string; username: string; email: string }
        items: Transaction[]
        total: number
        skip: number
        limit: number
      }
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    enabled: !!userId,
  })
}

// ============================================
// HOOK COMBINADO PARA PÁGINA
// ============================================

export interface SyncResult {
  total_checked: number
  updated: number
  confirmed: number
  failed: number
  still_pending: number
  errors?: Array<{ tx_hash?: string; tx_id?: number; error: string }>
}

export function useSyncTransactions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const response = await authFetch('/admin/transactions/sync', {
        method: 'POST',
      })
      return response.data as SyncResult
    },
    onSuccess: () => {
      // Invalidar queries para recarregar dados
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}

export function useSyncSingleTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transactionId: number) => {
      const response = await authFetch(`/admin/transactions/sync/${transactionId}`, {
        method: 'POST',
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}

export function useAdminTransactionsPage(filters: TransactionsFilters = {}) {
  const queryClient = useQueryClient()
  const stats = useTransactionStats()
  const transactions = useTransactions(filters)
  const syncMutation = useSyncTransactions()

  return {
    stats,
    transactions,
    isLoading: stats.isLoading || transactions.isLoading,
    error: stats.error || transactions.error,
    refetchAll: () => {
      stats.refetch()
      transactions.refetch()
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
    // Sincronização
    syncTransactions: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    syncResult: syncMutation.data,
  }
}
