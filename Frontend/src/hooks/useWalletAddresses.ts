import { useState, useEffect } from 'react'
import { walletService } from '../services/walletService'

export interface NetworkAddress {
  network: string
  symbol: string
  address: string
  isLoading: boolean
}

/**
 * Hook para buscar endereços de redes específicas de uma carteira multi
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
      setIsLoading(true)
      setError(null)
      
      try {
        const addressPromises = networks.map(async (network) => {
          const address = await walletService.getNetworkAddress(walletId, network)
          return { network, address }
        })

        const results = await Promise.all(addressPromises)
        
        const addressMap: Record<string, string> = {}
        results.forEach(({ network, address }) => {
          addressMap[network] = address
        })
        
        setAddresses(addressMap)
      } catch (err: any) {
        console.error('Error fetching network addresses:', err)
        setError(err.message || 'Erro ao carregar endereços')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAddresses()
  }, [walletId, networks.join(',')])

  return { addresses, isLoading, error }
}
