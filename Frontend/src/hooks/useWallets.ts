import { useState, useEffect, useCallback, useRef } from 'react'
import {
  walletService,
  WalletCreate,
  WalletRestore,
  WalletWithBalance,
  WalletWithMnemonic,
} from '../services/walletService'
import { useAuthStore } from '../stores/useAuthStore'

export interface UseWalletsResult {
  wallets: WalletWithBalance[]
  selectedWallet: WalletWithBalance | null
  isLoading: boolean
  isCreating: boolean
  error: string | null

  // Wallet management
  createWallet: (walletData: WalletCreate) => Promise<WalletWithMnemonic>
  restoreWallet: (walletData: WalletRestore) => Promise<void>
  selectWallet: (wallet: WalletWithBalance) => void
  refreshWallets: () => Promise<void>
  deleteWallet: (walletId: number) => Promise<void>
  updateWalletName: (walletId: number, name: string) => Promise<void>

  // Utilities
  clearError: () => void
  getSupportedNetworks: () => ReturnType<typeof walletService.getSupportedNetworks>
}

export const useWallets = (): UseWalletsResult => {
  const [wallets, setWallets] = useState<WalletWithBalance[]>([])
  const [selectedWallet, setSelectedWallet] = useState<WalletWithBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Começar como true para Safari
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const hasLoadedRef = useRef(false)

  const { isAuthenticated, user, _hasHydrated } = useAuthStore()

  // Carregar carteiras quando o usuário está autenticado
  const loadWallets = useCallback(async () => {
    // Verificar se já carregou para evitar duplicatas
    if (hasLoadedRef.current && wallets.length > 0) {
      setIsLoading(false)
      return
    }

    // Safari/iOS fix: verificar hydration
    const state = useAuthStore.getState()
    const isReady = state._hasHydrated || state.isAuthenticated || state.token

    if (!isReady) {
      console.log('[useWallets] ⏳ Waiting for hydration...')
      return
    }

    if (!state.isAuthenticated || !state.user) {
      console.log('[useWallets] ❌ Not authenticated')
      setIsLoading(false)
      return
    }

    if (!mountedRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('[useWallets] 🔄 Loading wallets...')
      const walletsData = await walletService.getWallets()
      console.log('[useWallets] ✅ Wallets loaded:', walletsData?.length || 0)

      if (mountedRef.current) {
        setWallets(walletsData)
        hasLoadedRef.current = true

        // Auto-selecionar primeira carteira se nenhuma estiver selecionada
        if (!selectedWallet && walletsData.length > 0) {
          setSelectedWallet(walletsData[0] || null)
        }
      }
    } catch (err: any) {
      console.error('[useWallets] ❌ Error loading wallets:', err)
      if (mountedRef.current) {
        setError(err.message || 'Erro ao carregar carteiras')
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [wallets.length, selectedWallet])

  // Criar nova carteira
  const createWallet = useCallback(
    async (walletData: WalletCreate): Promise<WalletWithMnemonic> => {
      setIsCreating(true)
      setError(null)

      try {
        console.log('[useWallets] 🎯 createWallet called with:', walletData)
        console.log('[useWallets] 🔐 Current auth status:', {
          isAuthenticated,
          user: user?.email,
          token: isAuthenticated ? '(exists)' : '(missing)',
        })

        const newWallet = await walletService.createWallet(walletData)
        console.log('[useWallets] ✅ Wallet created:', newWallet)

        // Recarregar lista de carteiras
        await loadWallets()

        return newWallet
      } catch (err: any) {
        console.error('[useWallets] ❌ Error creating wallet:', err)
        console.error('[useWallets] ❌ Error details:', {
          message: err.message,
          status: err.status,
          response: err.response?.data,
        })
        setError(err.message || 'Erro ao criar carteira')
        throw err
      } finally {
        setIsCreating(false)
      }
    },
    [loadWallets]
  )

  // Restaurar carteira existente
  const restoreWallet = useCallback(
    async (walletData: WalletRestore): Promise<void> => {
      setIsCreating(true)
      setError(null)

      try {
        console.log('Restoring wallet:', { ...walletData, mnemonic: '[HIDDEN]' })
        await walletService.restoreWallet(walletData)
        console.log('Wallet restored successfully')

        // Recarregar lista de carteiras
        await loadWallets()
      } catch (err: any) {
        console.error('Error restoring wallet:', err)
        setError(err.message || 'Erro ao restaurar carteira')
        throw err
      } finally {
        setIsCreating(false)
      }
    },
    [loadWallets]
  )

  // Selecionar carteira
  const selectWallet = useCallback((wallet: WalletWithBalance) => {
    console.log('Selecting wallet:', wallet.id, wallet.name)
    setSelectedWallet(wallet)
  }, [])

  // Atualizar carteiras
  const refreshWallets = useCallback(async (): Promise<void> => {
    await loadWallets()
  }, [loadWallets])

  // Excluir carteira
  const deleteWallet = useCallback(
    async (walletId: number): Promise<void> => {
      setError(null)

      try {
        console.log('Deleting wallet:', walletId)
        await walletService.deleteWallet(walletId)
        console.log('Wallet deleted successfully')

        // Remover da lista local
        setWallets(prev => prev.filter(w => w.id !== walletId))

        // Se a carteira excluída estava selecionada, selecionar outra
        if (selectedWallet?.id === walletId) {
          const remaining = wallets.filter(w => w.id !== walletId)
          setSelectedWallet(remaining.length > 0 ? remaining[0] || null : null)
        }
      } catch (err: any) {
        console.error('Error deleting wallet:', err)
        setError(err.message || 'Erro ao excluir carteira')
        throw err
      }
    },
    [selectedWallet, wallets]
  )

  // Atualizar nome da carteira
  const updateWalletName = useCallback(
    async (walletId: number, name: string): Promise<void> => {
      setError(null)

      try {
        console.log('Updating wallet name:', walletId, name)
        const updated = await walletService.updateWallet(walletId, { name })
        console.log('Wallet name updated:', updated)

        // Atualizar na lista local
        setWallets(prev => prev.map(w => (w.id === walletId ? { ...w, name: updated.name } : w)))

        // Atualizar carteira selecionada se necessário
        if (selectedWallet?.id === walletId) {
          setSelectedWallet(prev => (prev ? { ...prev, name: updated.name } : null))
        }
      } catch (err: any) {
        console.error('Error updating wallet name:', err)
        setError(err.message || 'Erro ao atualizar nome da carteira')
        throw err
      }
    },
    [selectedWallet]
  )

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Obter redes suportadas
  const getSupportedNetworks = useCallback(() => {
    return walletService.getSupportedNetworks()
  }, [])

  // Carregar carteiras quando autenticado - com retry para Safari/iOS
  useEffect(() => {
    let mounted = true
    mountedRef.current = true

    const initWallets = async () => {
      const state = useAuthStore.getState()
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      console.log('[useWallets] Init check:', {
        isAuthenticated: state.isAuthenticated,
        hasUser: !!state.user,
        _hasHydrated: state._hasHydrated,
        isSafari,
        isMobile,
      })

      if (state.isAuthenticated && state.user && mounted) {
        await loadWallets()
      }
    }

    initWallets()

    // Safari/iOS fix: retry após delays se não carregou
    const timer1 = setTimeout(() => {
      if (mountedRef.current && wallets.length === 0) {
        console.log('[useWallets] ⏰ Retry after 500ms')
        loadWallets()
      }
    }, 500)

    const timer2 = setTimeout(() => {
      if (mountedRef.current && wallets.length === 0) {
        console.log('[useWallets] ⏰ Retry after 1500ms')
        loadWallets()
      }
    }, 1500)

    // Subscrever a mudanças de auth para recarregar
    const unsubscribe = useAuthStore.subscribe(state => {
      if (
        state._hasHydrated &&
        state.isAuthenticated &&
        state.user &&
        mountedRef.current &&
        wallets.length === 0
      ) {
        console.log('[useWallets] 🔔 Auth state changed - loading wallets')
        loadWallets()
      }
    })

    return () => {
      mounted = false
      mountedRef.current = false
      clearTimeout(timer1)
      clearTimeout(timer2)
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, _hasHydrated])

  return {
    wallets,
    selectedWallet,
    isLoading,
    isCreating,
    error,

    // Actions
    createWallet,
    restoreWallet,
    selectWallet,
    refreshWallets,
    deleteWallet,
    updateWalletName,

    // Utilities
    clearError,
    getSupportedNetworks,
  }
}
