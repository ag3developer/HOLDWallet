import { useQuery } from '@tanstack/react-query'
import { APP_CONFIG } from '@/config/app'
import { useAuthStore } from '@/stores/useAuthStore'

interface Wallet {
  id: string
  user_id: string
  address: string
  network: string
  created_at: string
}

/**
 * Hook para buscar o wallet ID do usuário com cache
 * Usa React Query para cachear o resultado e evitar chamadas repetidas
 */
export const useUserWallet = () => {
  const { token } = useAuthStore()

  return useQuery({
    queryKey: ['user-wallet', token],
    queryFn: async () => {
      if (!token) {
        console.error('[useUserWallet] No token found')
        throw new Error('No authentication token')
      }

      console.log('[useUserWallet] Fetching wallet list...')
      const response = await fetch(`${APP_CONFIG.api.baseUrl}/wallets/`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch wallets: ${response.status}`)
      }

      const wallets: Wallet[] = await response.json()
      console.log('[useUserWallet] Wallets fetched:', wallets)

      if (!wallets?.length) {
        throw new Error('No wallets found')
      }

      return wallets[0]
    },
    enabled: !!token, // Só executa se tiver token
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Manter em cache por 10 minutos
    retry: 2,
    retryDelay: 1000,
  })
}
