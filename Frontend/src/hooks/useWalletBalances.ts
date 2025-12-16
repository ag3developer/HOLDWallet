import { useState, useEffect } from 'react'
import WalletService from '../services/wallet-service'
import { useAuthStore } from '../stores/useAuthStore'

export interface WalletBalances {
  [symbol: string]: number
}

// Simple in-memory cache for balances
const balancesCache = new Map<string, { data: WalletBalances; timestamp: number }>()
const CACHE_TTL = 120000 // 120 seconds (2 minutos) - aumentado para melhor performance

export function useWalletBalances(walletId?: string) {
  const [balances, setBalances] = useState<WalletBalances>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isStoreReady, setIsStoreReady] = useState(false)
  const { token } = useAuthStore()

  // Function to manually refresh balances
  const refreshBalances = async () => {
    if (!walletId) return

    try {
      setLoading(true)
      setError(null)
      console.log('[useWalletBalances] Manual refresh for wallet:', walletId)

      // Clear cache to force fresh fetch
      balancesCache.delete(walletId)
      const data = await WalletService.getWalletBalances(walletId)
      console.log('[useWalletBalances] Balances refreshed successfully:', data)

      // Cache the result
      balancesCache.set(walletId, { data, timestamp: Date.now() })
      setBalances(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh balances')
      setError(error)
      console.error('[useWalletBalances] Refresh error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Wait for Zustand store to be ready (rehydrated from localStorage)
  useEffect(() => {
    // Small delay to ensure localStorage is read by Zustand
    const timer = setTimeout(() => {
      setIsStoreReady(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isStoreReady) {
      console.log('[useWalletBalances] Store not ready yet, waiting...')
      setLoading(true)
      setBalances({})
      return
    }

    if (!walletId) {
      console.log('[useWalletBalances] No wallet ID provided')
      setLoading(false)
      setBalances({})
      return
    }

    const fetchBalances = async () => {
      try {
        // Check if we have fresh cached data
        const cached = balancesCache.get(walletId)
        const now = Date.now()

        if (cached && now - cached.timestamp < CACHE_TTL) {
          console.log('[useWalletBalances] Using cached balances for wallet:', walletId)
          setBalances(cached.data)
          setLoading(false)
          return
        }

        setLoading(true)
        setError(null)
        console.log('[useWalletBalances] Fetching balances for wallet:', walletId)

        const data = await WalletService.getWalletBalances(walletId)
        console.log('[useWalletBalances] Balances fetched successfully:', data)

        // Cache the result
        balancesCache.set(walletId, { data, timestamp: now })
        setBalances(data)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch balances')
        setError(error)

        // Log connection issues differently
        if (error.message.includes('Failed to fetch') || error.message.includes('timeout')) {
          console.warn(
            '[useWalletBalances] Connection issue (will retry automatically):',
            error.message
          )
        } else {
          console.error('[useWalletBalances] Error:', error)
        }

        setBalances({})
      } finally {
        setLoading(false)
      }
    }

    fetchBalances()
  }, [walletId, token, isStoreReady])

  return { balances, loading, error, refreshBalances }
}
