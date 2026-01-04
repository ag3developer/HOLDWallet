import { useState, useEffect } from 'react'
import { walletService } from '../services/walletService'

export interface NetworkAddress {
  network: string
  symbol: string
  address: string
  isLoading: boolean
}

// Cache de endereços para evitar requisições desnecessárias
const addressCache = new Map<string, { addresses: Record<string, string>; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Circuit breaker para evitar múltiplas tentativas quando o backend está offline
let backendOfflineUntil = 0
const CIRCUIT_BREAKER_DURATION = 30 * 1000 // 30 segundos

/**
 * Hook para buscar endereços de redes específicas de uma carteira multi
 * Com circuit breaker e cache para melhor performance
 */
export const useWalletAddresses = (walletId: string | undefined, networks: string[]) => {
  const [addresses, setAddresses] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!walletId || networks.length === 0) {
      setIsLoading(false)
      return
    }

    const fetchAddresses = async () => {
      // Check circuit breaker
      const now = Date.now()
      if (now < backendOfflineUntil) {
        console.warn('[useWalletAddresses] ⚠️ Circuit breaker active - backend appears offline')
        setIsLoading(false)
        setError('Backend temporarily unavailable')
        return
      }

      // Check cache
      const cacheKey = `${walletId}-${networks.join(',')}`
      const cached = addressCache.get(cacheKey)
      if (cached && now - cached.timestamp < CACHE_DURATION) {
        console.log('[useWalletAddresses] ✅ Using cached addresses')
        setAddresses(cached.addresses)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Buscar endereços com Promise.allSettled para não falhar tudo se uma rede falhar
        const addressPromises = networks.map(async network => {
          try {
            const address = await walletService.getNetworkAddress(walletId, network)
            return { network, address, success: true }
          } catch (err: unknown) {
            console.warn(
              `[useWalletAddresses] ⚠️ Failed to fetch ${network} address:`,
              err instanceof Error ? err.message : 'Unknown error'
            )
            return { network, address: '', success: false }
          }
        })

        const results = await Promise.allSettled(addressPromises)

        const addressMap: Record<string, string> = {}
        let hasNetworkError = false

        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success) {
            const { network, address } = result.value
            if (address) {
              addressMap[network] = address
            }
          } else if (result.status === 'rejected' || !result.value.success) {
            hasNetworkError = true
          }
        })

        // Se TODAS as requisições falharam, ativar circuit breaker
        if (Object.keys(addressMap).length === 0 && hasNetworkError) {
          console.error(
            '[useWalletAddresses] ❌ All address requests failed - activating circuit breaker'
          )
          backendOfflineUntil = Date.now() + CIRCUIT_BREAKER_DURATION
          setError('Unable to connect to backend')
        } else {
          // Cache os resultados bem-sucedidos
          addressCache.set(cacheKey, { addresses: addressMap, timestamp: now })
          setAddresses(addressMap)
        }
      } catch (err: any) {
        console.error('[useWalletAddresses] ❌ Critical error fetching addresses:', err)
        setError(err.message || 'Erro ao carregar endereços')
        // Ativar circuit breaker em erros críticos
        backendOfflineUntil = Date.now() + CIRCUIT_BREAKER_DURATION
      } finally {
        setIsLoading(false)
      }
    }

    fetchAddresses()
  }, [walletId, networks.join(',')])

  return { addresses, isLoading, error }
}
