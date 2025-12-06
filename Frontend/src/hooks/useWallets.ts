import { useState, useEffect, useCallback, useRef } from 'react'
import { walletService, WalletCreate, WalletRestore, WalletWithBalance, WalletWithMnemonic } from '../services/walletService'
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
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  
  const { isAuthenticated, user } = useAuthStore()

  // Carregar carteiras quando o usuário está autenticado
  const loadWallets = useCallback(async () => {
    if (!isAuthenticated || !user || !mountedRef.current) return

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Loading wallets...')
      const walletsData = await walletService.getWallets()
      console.log('Wallets loaded:', walletsData)
      
      setWallets(walletsData)
      
      // Auto-selecionar primeira carteira se nenhuma estiver selecionada
      if (!selectedWallet && walletsData.length > 0) {
        setSelectedWallet(walletsData[0] || null)
      }
    } catch (err: any) {
      console.error('Error loading wallets:', err)
      setError(err.message || 'Erro ao carregar carteiras')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user, selectedWallet])

  // Criar nova carteira
  const createWallet = useCallback(async (walletData: WalletCreate): Promise<WalletWithMnemonic> => {
    setIsCreating(true)
    setError(null)
    
    try {
      console.log('Creating wallet:', walletData)
      const newWallet = await walletService.createWallet(walletData)
      console.log('Wallet created:', newWallet)
      
      // Recarregar lista de carteiras
      await loadWallets()
      
      return newWallet
    } catch (err: any) {
      console.error('Error creating wallet:', err)
      setError(err.message || 'Erro ao criar carteira')
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [loadWallets])

  // Restaurar carteira existente
  const restoreWallet = useCallback(async (walletData: WalletRestore): Promise<void> => {
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
  }, [loadWallets])

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
  const deleteWallet = useCallback(async (walletId: number): Promise<void> => {
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
        setSelectedWallet(remaining.length > 0 ? (remaining[0] || null) : null)
      }
    } catch (err: any) {
      console.error('Error deleting wallet:', err)
      setError(err.message || 'Erro ao excluir carteira')
      throw err
    }
  }, [selectedWallet, wallets])

  // Atualizar nome da carteira
  const updateWalletName = useCallback(async (walletId: number, name: string): Promise<void> => {
    setError(null)
    
    try {
      console.log('Updating wallet name:', walletId, name)
      const updated = await walletService.updateWallet(walletId, { name })
      console.log('Wallet name updated:', updated)
      
      // Atualizar na lista local
      setWallets(prev => prev.map(w => 
        w.id === walletId ? { ...w, name: updated.name } : w
      ))
      
      // Atualizar carteira selecionada se necessário
      if (selectedWallet?.id === walletId) {
        setSelectedWallet(prev => prev ? { ...prev, name: updated.name } : null)
      }
    } catch (err: any) {
      console.error('Error updating wallet name:', err)
      setError(err.message || 'Erro ao atualizar nome da carteira')
      throw err
    }
  }, [selectedWallet])

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Obter redes suportadas
  const getSupportedNetworks = useCallback(() => {
    return walletService.getSupportedNetworks()
  }, [])

  // Carregar carteiras apenas uma vez quando o componente montar
  useEffect(() => {
    let mounted = true
    mountedRef.current = true
    
    const initWallets = async () => {
      if (isAuthenticated && user && mounted) {
        await loadWallets()
      }
    }
    
    initWallets()
    
    return () => {
      mounted = false
      mountedRef.current = false
    }
    // Apenas executar quando autenticação mudar, NÃO quando loadWallets mudar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

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
