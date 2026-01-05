/**
 * 🛡️ HOLD Wallet - Admin Wallets Hooks
 * =====================================
 *
 * React Query hooks para gestão de carteiras/saldos no admin.
 * Implementa cache inteligente e invalidação automática.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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

export interface WalletStats {
  total_wallets: number
  wallets_with_balance: number
  total_btc: number
  total_usdt: number
  total_brl: number
  wallets_today: number
}

export interface Wallet {
  id: string
  user_id: string
  username: string
  cryptocurrency: string
  network?: string
  address: string
  balance: number
  available_balance: number
  locked_balance: number
  created_at: string
  updated_at?: string
}

export interface WalletBalance {
  id: string
  user_id: string
  username: string
  cryptocurrency: string
  network?: string
  total_balance: number
  available_balance: number
  locked_balance: number
  updated_at?: string
}

export interface BalanceHistoryEntry {
  id: string
  cryptocurrency: string
  amount_change: number
  balance_before: number
  balance_after: number
  operation_type: string
  description?: string
  created_at: string
}

interface WalletsFilters {
  skip?: number
  limit?: number
  cryptocurrency?: string | undefined
  search?: string | undefined
}

interface BalancesFilters {
  skip?: number
  limit?: number
  cryptocurrency?: string | undefined
  min_balance?: number
}

interface AdjustBalancePayload {
  user_id: string
  cryptocurrency: string
  amount: number
  operation: 'add' | 'subtract' | 'set'
  reason: string
}

// ============================================
// QUERY KEYS
// ============================================

export const walletKeys = {
  all: ['admin', 'wallets'] as const,
  stats: () => [...walletKeys.all, 'stats'] as const,
  lists: () => [...walletKeys.all, 'list'] as const,
  list: (filters: WalletsFilters) => [...walletKeys.lists(), filters] as const,
  userWallets: (userId: string) => [...walletKeys.all, 'user', userId] as const,
  balances: (filters: BalancesFilters) => [...walletKeys.all, 'balances', filters] as const,
  balanceHistory: (userId: string) => [...walletKeys.all, 'history', userId] as const,
}

// ============================================
// HOOKS - ESTATÍSTICAS
// ============================================

export function useWalletStats() {
  return useQuery({
    queryKey: walletKeys.stats(),
    queryFn: async () => {
      const response = await authFetch('/admin/wallets/stats')
      return response.data as WalletStats
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false,
  })
}

// ============================================
// HOOKS - LISTAGEM DE CARTEIRAS
// ============================================

export function useWallets(filters: WalletsFilters = {}) {
  return useQuery({
    queryKey: walletKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.skip) params.append('skip', String(filters.skip))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.cryptocurrency) params.append('cryptocurrency', filters.cryptocurrency)
      if (filters.search) params.append('search', filters.search)

      const queryString = params.toString()
      const endpoint = queryString ? `/admin/wallets?${queryString}` : '/admin/wallets'

      const response = await authFetch(endpoint)
      return response.data as {
        items: Wallet[]
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
// HOOKS - CARTEIRAS DO USUÁRIO
// ============================================

export function useUserWallets(userId: string) {
  return useQuery({
    queryKey: walletKeys.userWallets(userId),
    queryFn: async () => {
      const response = await authFetch(`/admin/wallets/user/${userId}`)
      return response.data as {
        user: { id: string; username: string; email: string }
        wallets: Wallet[]
      }
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    enabled: !!userId,
  })
}

// ============================================
// HOOKS - SALDOS
// ============================================

export function useWalletBalances(filters: BalancesFilters = {}) {
  return useQuery({
    queryKey: walletKeys.balances(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.skip) params.append('skip', String(filters.skip))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.cryptocurrency) params.append('cryptocurrency', filters.cryptocurrency)
      if (filters.min_balance !== undefined)
        params.append('min_balance', String(filters.min_balance))

      const queryString = params.toString()
      const endpoint = queryString
        ? `/admin/wallets/balances?${queryString}`
        : '/admin/wallets/balances'

      const response = await authFetch(endpoint)
      return response.data as {
        items: WalletBalance[]
        total: number
        skip: number
        limit: number
      }
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })
}

// ============================================
// HOOKS - HISTÓRICO DE SALDO
// ============================================

export function useBalanceHistory(userId: string) {
  return useQuery({
    queryKey: walletKeys.balanceHistory(userId),
    queryFn: async () => {
      const response = await authFetch(`/admin/wallets/balances/history/${userId}`)
      return response.data as {
        user: { id: string; username: string; email: string }
        items: BalanceHistoryEntry[]
        total: number
      }
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    enabled: !!userId,
  })
}

// ============================================
// HOOKS - MUTATIONS (AJUSTAR SALDO)
// ============================================

export function useAdjustBalance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: AdjustBalancePayload) => {
      return authFetch('/admin/wallets/balances/adjust', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (_data, variables) => {
      // Invalidar cache após ajuste
      queryClient.invalidateQueries({ queryKey: walletKeys.stats() })
      queryClient.invalidateQueries({ queryKey: walletKeys.lists() })
      queryClient.invalidateQueries({ queryKey: walletKeys.userWallets(variables.user_id) })
      queryClient.invalidateQueries({ queryKey: walletKeys.balanceHistory(variables.user_id) })
      // Invalidar todos os balances
      queryClient.invalidateQueries({ queryKey: [...walletKeys.all, 'balances'] })
    },
  })
}

// ============================================
// HOOK COMBINADO PARA PÁGINA
// ============================================

export function useAdminWalletsPage(filters: WalletsFilters = {}) {
  const stats = useWalletStats()
  const wallets = useWallets(filters)

  return {
    stats,
    wallets,
    isLoading: stats.isLoading || wallets.isLoading,
    error: stats.error || wallets.error,
    refetchAll: () => {
      stats.refetch()
      wallets.refetch()
    },
  }
}
