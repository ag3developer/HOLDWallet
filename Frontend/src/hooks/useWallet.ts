import { useState, useEffect } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useQueries,
} from '@tanstack/react-query'
import { walletService } from '@/services'
import type { Wallet } from '@/types'
import { useAuthStore } from '@/stores/useAuthStore'

// Query keys
export const walletKeys = {
  all: ['wallets'] as const,
  lists: () => [...walletKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...walletKeys.lists(), filters] as const,
  details: () => [...walletKeys.all, 'detail'] as const,
  detail: (id: string) => [...walletKeys.details(), id] as const,
  balance: (id: string) => [...walletKeys.detail(id), 'balance'] as const,
  balancesByNetwork: (id: string) => [...walletKeys.detail(id), 'balances-by-network'] as const,
  transactions: (id: string) => [...walletKeys.detail(id), 'transactions'] as const,
  stats: (id: string, period?: string) => [...walletKeys.detail(id), 'stats', period] as const,
}

// Get all wallets - with retry for mobile browsers
export function useWallets() {
  const { token, isAuthenticated, _hasHydrated } = useAuthStore()
  const [localHydrated, setLocalHydrated] = useState(false)
  const [safariReady, setSafariReady] = useState(false)

  // Detectar Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  // Aguardar hydration do Zustand (importante para Safari/iOS)
  useEffect(() => {
    // Verificar se o store já está hidratado
    const checkHydration = () => {
      const state = useAuthStore.getState()
      if (state._hasHydrated || state.token || state.isAuthenticated) {
        setLocalHydrated(true)
      }
    }

    // Verificar imediatamente
    checkHydration()

    // Verificar novamente após um curto delay (para Safari)
    const timer = setTimeout(checkHydration, 100)
    const timer2 = setTimeout(checkHydration, 500)

    // Safari precisa de mais tempo às vezes
    const timer3 = setTimeout(() => {
      checkHydration()
      setSafariReady(true)
    }, 1000)

    // Também subscrever a mudanças
    const unsubscribe = useAuthStore.subscribe(checkHydration)

    return () => {
      clearTimeout(timer)
      clearTimeout(timer2)
      clearTimeout(timer3)
      unsubscribe()
    }
  }, [])

  // Safari: forçar ready após timeout
  useEffect(() => {
    if (isSafari && !localHydrated) {
      const forceTimer = setTimeout(() => {
        console.log('[useWallets] Safari force ready triggered')
        setLocalHydrated(true)
        setSafariReady(true)
      }, 1500)
      return () => clearTimeout(forceTimer)
    }
  }, [isSafari, localHydrated])

  const isReady = _hasHydrated || localHydrated || safariReady

  return useQuery({
    queryKey: walletKeys.list(),
    queryFn: async () => {
      console.log('[useWallets] Fetching wallets...', {
        hasToken: !!token,
        isAuthenticated,
        isReady,
        _hasHydrated,
        localHydrated,
        safariReady,
        isSafari,
        isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
        userAgent: navigator.userAgent.substring(0, 50),
      })

      // Double check token exists - try multiple sources
      let currentToken = useAuthStore.getState().token

      // Fallback: tentar pegar do localStorage diretamente (Safari às vezes demora)
      if (!currentToken) {
        try {
          const storageKey = 'wolk-auth' // APP_CONFIG.storage.prefix + auth key
          const stored = localStorage.getItem(storageKey)
          if (stored) {
            const parsed = JSON.parse(stored)
            currentToken = parsed?.state?.token
            console.log('[useWallets] Token recovered from localStorage fallback')
          }
        } catch (e) {
          console.warn('[useWallets] localStorage fallback failed:', e)
        }
      }

      if (!currentToken) {
        console.warn('[useWallets] No token available, skipping fetch')
        return []
      }

      try {
        const wallets = await walletService.getWallets()
        console.log('[useWallets] Wallets loaded:', wallets?.length || 0)
        return wallets
      } catch (error: any) {
        console.error('[useWallets] Error fetching wallets:', error.message)
        // Retry once if it's a network error (common on mobile)
        if (error.message?.includes('Network') || error.code === 'ERR_NETWORK') {
          console.log('[useWallets] Retrying after network error...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          return walletService.getWallets()
        }
        throw error
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    // Removido placeholderData: [] - causava problemas no Safari
    // placeholderData: [],
    retry: 3, // Retry 3 times on failure (aumentado para Safari)
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    // Safari: enabled mais permissivo - tenta buscar assim que possível
    enabled: Boolean((isAuthenticated && token) || isReady || safariReady),
    // Safari: refetch quando window ganha foco (útil após sleep)
    refetchOnWindowFocus: true,
  })
}

// Get specific wallet
export function useWallet(walletId: string, enabled = true) {
  return useQuery({
    queryKey: walletKeys.detail(walletId),
    queryFn: () => walletService.getWallet(walletId),
    enabled: enabled && !!walletId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Get wallet balance
export function useWalletBalance(walletId: string, enabled = true) {
  return useQuery({
    queryKey: walletKeys.balance(walletId),
    queryFn: () => walletService.getWalletBalance(walletId),
    enabled: enabled && !!walletId,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  })
}

// Get wallet balances by network (for multi-network wallets)
export function useWalletBalancesByNetwork(walletId: string, enabled = true) {
  return useQuery({
    queryKey: walletKeys.balancesByNetwork(walletId),
    queryFn: async () => {
      console.log(`[DEBUG] Fetching balances for wallet:`, walletId)
      const result = await walletService.getWalletBalancesByNetwork(walletId)
      console.log(`[DEBUG] Balances received for ${walletId}:`, result)
      return result
    },
    enabled: enabled && !!walletId,
    staleTime: 60 * 1000, // Keep fresh for 60 seconds
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: 120 * 1000, // Auto-refresh every 2 minutes (reduced from 60)
  })
}

// Get balances for multiple wallets by network
// Optimized for performance: caches results, reduces refetches
export function useMultipleWalletBalances(walletIds: string[]) {
  return useQueries({
    queries: walletIds.map(id => ({
      queryKey: walletKeys.balancesByNetwork(id),
      queryFn: () => walletService.getWalletBalancesByNetwork(id),
      staleTime: 60 * 1000, // Keep fresh for 60 seconds
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      refetchInterval: 120 * 1000, // Auto-refresh every 2 minutes
    })),
  })
}

// Create wallet mutation
export function useCreateWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: walletService.createWallet,
    onSuccess: () => {
      // Invalidate wallets list
      queryClient.invalidateQueries({ queryKey: walletKeys.lists() })
    },
  })
}

// Import wallet mutation
export function useImportWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: walletService.importWallet,
    onSuccess: () => {
      // Invalidate wallets list
      queryClient.invalidateQueries({ queryKey: walletKeys.lists() })
    },
  })
}

// Update wallet mutation
export function useUpdateWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      walletId,
      updates,
    }: {
      walletId: string
      updates: Partial<Pick<Wallet, 'name' | 'isActive'>>
    }) => walletService.updateWallet(walletId, updates),
    onSuccess: (updatedWallet, { walletId }) => {
      // Update cached wallet data
      queryClient.setQueryData(walletKeys.detail(walletId), updatedWallet)
      // Invalidate wallets list
      queryClient.invalidateQueries({ queryKey: walletKeys.lists() })
    },
  })
}

// Delete wallet mutation
export function useDeleteWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (walletId: string) => walletService.deleteWallet(walletId),
    onSuccess: (_, walletId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: walletKeys.detail(walletId) })
      // Invalidate wallets list
      queryClient.invalidateQueries({ queryKey: walletKeys.lists() })
    },
  })
}

// Refresh wallet balance
export function useRefreshBalance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (walletId: string) => walletService.getWalletBalance(walletId, true),
    onSuccess: (balance, walletId) => {
      // Update cached balance
      queryClient.setQueryData(walletKeys.balance(walletId), balance)
    },
  })
}

// Get receive address
export function useReceiveAddress(walletId: string, enabled = true) {
  return useQuery({
    queryKey: [...walletKeys.detail(walletId), 'receive'],
    queryFn: () => walletService.getReceiveAddress(walletId),
    enabled: enabled && !!walletId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Send transaction mutation
export function useSendTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: walletService.sendTransaction,
    onSuccess: transaction => {
      // Invalidate wallet balance and transactions
      queryClient.invalidateQueries({
        queryKey: walletKeys.balance(transaction.walletId),
      })
      queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(transaction.walletId),
      })
    },
  })
}

// Estimate transaction fee
export function useEstimateFee() {
  return useMutation({
    mutationFn: ({
      walletId,
      toAddress,
      amount,
      priority,
    }: {
      walletId: string
      toAddress: string
      amount: string
      priority?: 'low' | 'medium' | 'high'
    }) => walletService.estimateFee(walletId, toAddress, amount, priority),
  })
}

// Get wallet transactions with infinite query
export function useWalletTransactions(walletId: string, filters?: Record<string, any>) {
  return useInfiniteQuery({
    queryKey: [...walletKeys.transactions(walletId), filters],
    queryFn: ({ pageParam = 1 }) =>
      walletService.getWalletTransactions(walletId, pageParam as number, 20, filters),
    getNextPageParam: (lastPage: any) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!walletId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Get all transactions with infinite query
export function useTransactions(filters?: Record<string, any>) {
  return useInfiniteQuery({
    queryKey: ['transactions', 'all', filters],
    queryFn: ({ pageParam = 1 }) => walletService.getTransactions(pageParam as number, 20, filters),
    getNextPageParam: (lastPage: any) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Get specific transaction
export function useTransaction(transactionId: string, enabled = true) {
  return useQuery({
    queryKey: ['transactions', 'detail', transactionId],
    queryFn: () => walletService.getTransaction(transactionId),
    enabled: enabled && !!transactionId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Cancel transaction mutation
export function useCancelTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (transactionId: string) => walletService.cancelTransaction(transactionId),
    onSuccess: transaction => {
      // Update cached transaction
      queryClient.setQueryData(['transactions', 'detail', transaction.id], transaction)
      // Invalidate transactions list
      queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(transaction.walletId),
      })
    },
  })
}

// Resend transaction mutation
export function useResendTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (transactionId: string) => walletService.resendTransaction(transactionId),
    onSuccess: transaction => {
      // Update cached transaction
      queryClient.setQueryData(['transactions', 'detail', transaction.id], transaction)
      // Invalidate transactions list
      queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(transaction.walletId),
      })
    },
  })
}

// Get supported coins
export function useSupportedCoins() {
  return useQuery({
    queryKey: ['wallets', 'supported-coins'],
    queryFn: () => walletService.getSupportedCoins(),
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

// Validate address
export function useValidateAddress() {
  return useMutation({
    mutationFn: ({ coin, address }: { coin: string; address: string }) =>
      walletService.validateAddress(coin, address),
  })
}

// Export wallet
export function useExportWallet() {
  return useMutation({
    mutationFn: ({ walletId, password }: { walletId: string; password: string }) =>
      walletService.exportWallet(walletId, password),
  })
}

// Backup wallet
export function useBackupWallet() {
  return useMutation({
    mutationFn: (walletId: string) => walletService.backupWallet(walletId),
  })
}

// Restore wallet
export function useRestoreWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      backupData,
      checksum,
      newName,
    }: {
      backupData: string
      checksum: string
      newName?: string
    }) => walletService.restoreWallet(backupData, checksum, newName),
    onSuccess: () => {
      // Invalidate wallets list
      queryClient.invalidateQueries({ queryKey: walletKeys.lists() })
    },
  })
}

// Get wallet statistics
export function useWalletStats(
  walletId: string,
  period: '24h' | '7d' | '30d' | '1y' = '30d',
  enabled = true
) {
  return useQuery({
    queryKey: walletKeys.stats(walletId, period),
    queryFn: () => walletService.getWalletStats(walletId, period),
    enabled: enabled && !!walletId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
