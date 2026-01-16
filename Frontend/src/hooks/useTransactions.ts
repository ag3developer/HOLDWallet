import { useState, useEffect, useCallback, useRef } from 'react'
import { transactionService, Transaction, TransactionFilters } from '../services/transactionService'
import { useAuthStore } from '../stores/useAuthStore'

export interface UseTransactionsResult {
  transactions: Transaction[]
  isLoading: boolean
  error: string | null
  totalCount: number

  // Actions
  refreshTransactions: () => Promise<void>
  syncWalletTransactions: (walletId: string) => Promise<void>
  loadMore: () => Promise<void>

  // Utilities
  clearError: () => void
  hasMore: boolean
}

export const useTransactions = (filters?: TransactionFilters): UseTransactionsResult => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const mountedRef = useRef(true)

  const { isAuthenticated, user } = useAuthStore()
  const limit = filters?.limit || 20

  // Carregar transações
  const loadTransactions = useCallback(
    async (currentOffset: number = 0, append: boolean = false) => {
      if (!isAuthenticated || !user || !mountedRef.current) return

      setIsLoading(true)
      setError(null)

      try {
        console.log('Loading transactions...', { offset: currentOffset, filters })

        // SEMPRE buscar do banco de dados via /tx/ (não do blockchain)
        // As transações já são salvas no banco quando enviadas via /wallets/send
        const response = await transactionService.getTransactions({
          ...filters,
          offset: currentOffset,
          limit,
        })

        console.log('Transactions loaded from database:', response)

        if (append) {
          setTransactions(prev => [...prev, ...response.transactions])
        } else {
          setTransactions(response.transactions)
        }

        // Usar total ou total_count (compatibilidade)
        setTotalCount(response.total ?? response.total_count ?? 0)
        setOffset(currentOffset)
      } catch (err: any) {
        console.error('Error loading transactions:', err)
        setError(err.message || 'Erro ao carregar transações')
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user, filters, limit]
  )

  // Recarregar transações
  const refreshTransactions = useCallback(async (): Promise<void> => {
    await loadTransactions(0, false)
  }, [loadTransactions])

  // Carregar mais transações (paginação)
  const loadMore = useCallback(async (): Promise<void> => {
    const newOffset = offset + limit
    if (newOffset < totalCount) {
      await loadTransactions(newOffset, true)
    }
  }, [offset, limit, totalCount, loadTransactions])

  // Sincronizar transações da carteira
  const syncWalletTransactions = useCallback(
    async (walletId: string): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        console.log('Syncing wallet transactions:', walletId)
        const result = await transactionService.syncWalletTransactions(walletId)
        console.log('Sync result:', result)

        // Recarregar transações após sincronização
        await refreshTransactions()
      } catch (err: any) {
        console.error('Error syncing transactions:', err)
        setError(err.message || 'Erro ao sincronizar transações')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [refreshTransactions]
  )

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Verificar se há mais transações para carregar
  const hasMore = offset + limit < totalCount

  // Carregar transações apenas uma vez quando o componente montar
  useEffect(() => {
    let mounted = true
    mountedRef.current = true

    const initTransactions = async () => {
      if (isAuthenticated && user && mounted) {
        await loadTransactions(0, false)
      }
    }

    initTransactions()

    return () => {
      mounted = false
      mountedRef.current = false
    }
    // Apenas executar quando autenticação mudar, NÃO quando loadTransactions mudar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

  return {
    transactions,
    isLoading,
    error,
    totalCount,

    // Actions
    refreshTransactions,
    syncWalletTransactions,
    loadMore,

    // Utilities
    clearError,
    hasMore,
  }
}
