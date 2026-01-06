/**
 * Hook para cache de status biométrico
 * Evita chamadas repetidas à API quando navega entre páginas
 */

import { useState, useEffect, useCallback } from 'react'
import { webAuthnService, WebAuthnStatus } from '@/services/webauthn'

const CACHE_KEY = 'biometric_status_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

interface CachedData {
  status: WebAuthnStatus
  timestamp: number
  isSupported: boolean
  isPlatformAvailable: boolean
}

// Cache em memória para evitar re-renderização
let memoryCache: CachedData | null = null

export const useBiometricCache = () => {
  const [status, setStatus] = useState<WebAuthnStatus | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Verificar se o cache é válido
  const isCacheValid = useCallback((cached: CachedData | null): boolean => {
    if (!cached) return false
    const now = Date.now()
    return now - cached.timestamp < CACHE_DURATION
  }, [])

  // Carregar do localStorage
  const loadFromLocalStorage = useCallback((): CachedData | null => {
    try {
      const stored = localStorage.getItem(CACHE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.warn('Erro ao ler cache do localStorage:', e)
    }
    return null
  }, [])

  // Salvar no localStorage e memória
  const saveToCache = useCallback((data: CachedData) => {
    memoryCache = data
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('Erro ao salvar cache:', e)
    }
  }, [])

  // Carregar status (usa cache se válido)
  const loadStatus = useCallback(
    async (forceRefresh = false) => {
      // 1. Verificar cache em memória primeiro (mais rápido)
      if (!forceRefresh && memoryCache && isCacheValid(memoryCache)) {
        setStatus(memoryCache.status)
        setIsSupported(memoryCache.isSupported)
        setIsPlatformAvailable(memoryCache.isPlatformAvailable)
        setIsLoading(false)
        return memoryCache.status
      }

      // 2. Verificar localStorage
      if (!forceRefresh) {
        const localCache = loadFromLocalStorage()
        if (localCache && isCacheValid(localCache)) {
          memoryCache = localCache
          setStatus(localCache.status)
          setIsSupported(localCache.isSupported)
          setIsPlatformAvailable(localCache.isPlatformAvailable)
          setIsLoading(false)
          return localCache.status
        }
      }

      // 3. Carregar da API
      setIsLoading(true)
      setError(null)

      try {
        const supported = webAuthnService.isSupported()
        setIsSupported(supported)

        if (supported) {
          const platformAvailable = await webAuthnService.isPlatformAuthenticatorAvailable()
          setIsPlatformAvailable(platformAvailable)

          const currentStatus = await webAuthnService.getStatus()
          setStatus(currentStatus)

          // Salvar no cache
          const cacheData: CachedData = {
            status: currentStatus,
            timestamp: Date.now(),
            isSupported: supported,
            isPlatformAvailable: platformAvailable,
          }
          saveToCache(cacheData)

          return currentStatus
        } else {
          const emptyStatus: WebAuthnStatus = { has_biometric: false, credentials: [] }
          setStatus(emptyStatus)
          return emptyStatus
        }
      } catch (err: any) {
        console.error('Erro ao carregar status:', err)
        setError('Erro ao carregar configurações de biometria')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [isCacheValid, loadFromLocalStorage, saveToCache]
  )

  // Invalidar cache (chamar após registrar/deletar credencial)
  const invalidateCache = useCallback(() => {
    memoryCache = null
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch (e) {
      console.warn('Erro ao remover cache:', e)
    }
  }, [])

  // Forçar refresh
  const refresh = useCallback(async () => {
    invalidateCache()
    return loadStatus(true)
  }, [invalidateCache, loadStatus])

  // Carregar no mount
  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  return {
    status,
    isSupported,
    isPlatformAvailable,
    isLoading,
    error,
    refresh,
    invalidateCache,
  }
}

// Função utilitária para invalidar cache de fora do hook
export const invalidateBiometricCache = () => {
  memoryCache = null
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch (e) {
    console.warn('Erro ao remover cache:', e)
  }
}
