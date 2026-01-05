import { useState, useEffect, useCallback } from 'react'
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
 * Com circuit breaker, cache e suporte para rede prioritária
 */
export const useWalletAddresses = (
  walletId: string | undefined,
  networks: string[],
  priorityNetwork?: string // Rede que será carregada primeiro
) => {
  const [addresses, setAddresses] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isPriorityLoaded, setIsPriorityLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Função para buscar um único endereço
  const fetchSingleAddress = useCallback(
    async (network: string): Promise<string> => {
      if (!walletId) return ''

      // Verificar cache individual
      const cacheKey = `${walletId}-${network}`
      const cached = addressCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.addresses[network] || ''
      }

      try {
        const address = await walletService.getNetworkAddress(walletId, network)
        // Salvar no cache
        addressCache.set(cacheKey, {
          addresses: { [network]: address },
          timestamp: Date.now(),
        })
        return address
      } catch {
        return ''
      }
    },
    [walletId]
  )

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

      // Check cache completo
      const cacheKey = `${walletId}-${networks.join(',')}`
      const cached = addressCache.get(cacheKey)
      if (cached && now - cached.timestamp < CACHE_DURATION) {
        console.log('[useWalletAddresses] ✅ Using cached addresses')
        setAddresses(cached.addresses)
        setIsLoading(false)
        setIsPriorityLoaded(true)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // PASSO 1: Carregar rede prioritária primeiro (se especificada)
        if (priorityNetwork && networks.includes(priorityNetwork)) {
          console.log(`[useWalletAddresses] 🚀 Loading priority network first: ${priorityNetwork}`)
          const priorityAddress = await fetchSingleAddress(priorityNetwork)
          if (priorityAddress) {
            setAddresses(prev => ({ ...prev, [priorityNetwork]: priorityAddress }))
            setIsPriorityLoaded(true)
            console.log(
              `[useWalletAddresses] ✅ Priority network ${priorityNetwork} loaded quickly`
            )
          }
        }

        // PASSO 2: Buscar demais endereços em paralelo (exceto o prioritário já carregado)
        const remainingNetworks = priorityNetwork
          ? networks.filter(n => n !== priorityNetwork)
          : networks

        const addressPromises = remainingNetworks.map(async network => {
          try {
            const address = await walletService.getNetworkAddress(walletId, network)
            return { network, address, success: true }
          } catch (err: unknown) {
            // Identificar tipo de erro para log apropriado
            const isTimeout =
              err instanceof Error &&
              (err.message?.includes('timeout') || (err as any).code === 'ECONNABORTED')
            const isCancelled =
              err instanceof Error &&
              ((err as any).code === 'ERR_CANCELED' || err.name === 'CanceledError')

            // Não logar erros cancelados (navegação do usuário)
            if (isCancelled) {
              return { network, address: '', success: false }
            }

            if (isTimeout) {
              console.debug(`[useWalletAddresses] ⏱️ Timeout fetching ${network} address`)
            } else {
              console.warn(
                `[useWalletAddresses] ⚠️ Failed to fetch ${network} address:`,
                err instanceof Error ? err.message : 'Unknown error'
              )
            }
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
          // Incluir endereço prioritário se já foi carregado
          setAddresses(prev => {
            const finalAddresses = { ...prev, ...addressMap }
            // Cache os resultados completos
            addressCache.set(cacheKey, { addresses: finalAddresses, timestamp: now })
            return finalAddresses
          })
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
  }, [walletId, networks.join(','), priorityNetwork, fetchSingleAddress])

  return { addresses, isLoading, isPriorityLoaded, error }
}
