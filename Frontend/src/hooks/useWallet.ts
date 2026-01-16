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

/**
 * Safari/WebKit Token Recovery
 * Safari pode ter atrasos na hidratação do localStorage em PWA mode
 * Esta função tenta múltiplas fontes para garantir o token
 */
const recoverAuthToken = (): string | null => {
  // 1. Primeiro tentar o store do Zustand
  const storeToken = useAuthStore.getState().token
  if (storeToken) {
    return storeToken
  }

  // 2. Tentar localStorage diretamente (Safari fallback)
  try {
    const storageKeys = ['wolk-auth', 'holdwallet-auth', 'auth-storage']
    for (const key of storageKeys) {
      const stored = localStorage.getItem(key)
      if (stored) {
        const parsed = JSON.parse(stored)
        const token = parsed?.state?.token || parsed?.token
        if (token) {
          console.log(`[TokenRecovery] ✅ Token recovered from localStorage key: ${key}`)
          return token
        }
      }
    }
  } catch (e) {
    console.warn('[TokenRecovery] localStorage fallback failed:', e)
  }

  // 3. Tentar sessionStorage como última opção
  try {
    const sessionToken = sessionStorage.getItem('auth_token_backup')
    if (sessionToken) {
      console.log('[TokenRecovery] ✅ Token recovered from sessionStorage backup')
      return sessionToken
    }
  } catch {
    // sessionStorage não disponível (modo privado)
  }

  return null
}

/**
 * Detecta ambiente do navegador
 */
const getBrowserInfo = () => {
  if (typeof navigator === 'undefined') {
    return { isSafari: false, isMobile: false, isPWA: false, isIOS: false }
  }

  const ua = navigator.userAgent
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua)
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isPWA =
    typeof globalThis !== 'undefined' &&
    globalThis.window &&
    (globalThis.matchMedia?.('(display-mode: standalone)')?.matches ||
      (globalThis.navigator as any)?.standalone === true)

  return { isSafari, isMobile, isPWA, isIOS }
}

// Get all wallets - with robust Safari/PWA support
export function useWallets() {
  const { _hasHydrated } = useAuthStore()
  const [authReady, setAuthReady] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const queryClient = useQueryClient()

  const browserInfo = getBrowserInfo()
  const needsExtraTime = browserInfo.isSafari || browserInfo.isMobile || browserInfo.isPWA

  // Robust hydration check with multiple fallbacks
  useEffect(() => {
    let mounted = true
    const timers: NodeJS.Timeout[] = []

    const checkAuth = () => {
      if (!mounted) return false

      const recoveredToken = recoverAuthToken()
      const storeState = useAuthStore.getState()

      const isReady = Boolean(
        recoveredToken || storeState.token || storeState.isAuthenticated || storeState._hasHydrated
      )

      if (isReady && !authReady) {
        console.log('[useWallets] ✅ Auth ready detected', {
          hasToken: !!recoveredToken,
          storeHydrated: storeState._hasHydrated,
          browser: browserInfo,
        })
        setAuthReady(true)

        // Backup token to sessionStorage for recovery
        if (recoveredToken) {
          try {
            sessionStorage.setItem('auth_token_backup', recoveredToken)
          } catch {
            // sessionStorage not available
          }
        }
      }

      return isReady
    }

    // Check immediately
    if (checkAuth()) return

    // Progressive delay checks (faster for non-Safari)
    const delays = needsExtraTime ? [50, 150, 300, 500, 800, 1200] : [50, 100, 200]

    delays.forEach(delay => {
      timers.push(setTimeout(checkAuth, delay))
    })

    // Subscribe to store changes
    const unsubscribe = useAuthStore.subscribe(() => {
      checkAuth()
    })

    return () => {
      mounted = false
      timers.forEach(clearTimeout)
      unsubscribe()
    }
  }, [needsExtraTime, authReady])

  // Query configuration
  const query = useQuery({
    queryKey: walletKeys.list(),
    queryFn: async () => {
      const currentToken = recoverAuthToken()

      console.log('[useWallets] 🔄 Fetching wallets...', {
        hasToken: !!currentToken,
        authReady,
        retryCount,
        browser: browserInfo,
      })

      if (!currentToken) {
        // Incrementar retry para forçar nova tentativa
        setRetryCount(prev => prev + 1)
        throw new Error('AUTH_TOKEN_PENDING')
      }

      try {
        const wallets = await walletService.getWallets()

        console.log('[useWallets] ✅ Wallets loaded:', wallets?.length || 0)

        // Se retornou 0 carteiras, pode ser cache stale - invalidar e tentar novamente uma vez
        if (wallets?.length === 0 && retryCount < 2) {
          console.log('[useWallets] ⚠️ Empty response, will retry...')
          setRetryCount(prev => prev + 1)
        }

        return wallets || []
      } catch (error: any) {
        console.error('[useWallets] ❌ Error:', error.message || error)

        // Network errors - check if retryable
        const isNetworkError = error.isNetworkError || 
          error.code === 'ERR_NETWORK' || 
          error.code === 'TIMEOUT_ERROR' ||
          error.message?.includes('Network') ||
          error.message?.includes('timeout')

        if (isNetworkError) {
          // For network errors, return empty array instead of throwing
          // This prevents the UI from showing error state constantly
          if (retryCount >= 2) {
            console.warn('[useWallets] ⚠️ Network error after retries, returning empty')
            return []
          }
          throw error // React Query will retry
        }

        // Auth errors - clear cache and retry
        if (error.response?.status === 401) {
          queryClient.removeQueries({ queryKey: walletKeys.all })
          throw new Error('AUTH_EXPIRED')
        }

        throw error
      }
    },
    staleTime: 15 * 1000, // 15 seconds - more aggressive refresh
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    retry: (failureCount, error: any) => {
      // Token pending - retry more aggressively
      if (error?.message === 'AUTH_TOKEN_PENDING') {
        return failureCount < 5 // Reduced from 8
      }
      // Auth expired - don't retry
      if (error?.message === 'AUTH_EXPIRED') {
        return false
      }
      // Network errors - limited retries
      if (error?.isNetworkError || error?.code === 'ERR_NETWORK') {
        return failureCount < 2 // Only 2 retries for network errors
      }
      // Other errors - retry 2x
      return failureCount < 2
    },
    retryDelay: (attemptIndex, error: any) => {
      // Token pending - shorter delays
      if (error?.message === 'AUTH_TOKEN_PENDING') {
        return Math.min(150 * (attemptIndex + 1), 800) // Faster retries
      }
      // Network errors - quick retries
      if (error?.isNetworkError || error?.code === 'ERR_NETWORK') {
        return Math.min(300 * (attemptIndex + 1), 1000)
      }
      // Other errors - standard backoff
      return Math.min(400 * 2 ** attemptIndex, 2000)
    },
    // Enable quando auth está ready OU após timeout forçado
    enabled: authReady || retryCount > 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    // Safari: não refetch automático em background
    refetchOnReconnect: !browserInfo.isSafari,
  })

  // Force refetch on retry count change (Safari recovery mechanism)
  useEffect(() => {
    if (retryCount > 0 && retryCount <= 3 && authReady) {
      const timer = setTimeout(() => {
        console.log('[useWallets] 🔄 Force refetch triggered, attempt:', retryCount)
        query.refetch()
      }, 500 * retryCount)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [retryCount, authReady])

  return query
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
