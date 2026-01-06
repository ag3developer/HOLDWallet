/**
 * useWebAuthn Hook
 * Hook para gerenciar estado de autenticação biométrica
 */

import { useState, useEffect, useCallback } from 'react'
import { webAuthnService, WebAuthnStatus } from '@/services/webauthn'

interface UseWebAuthnReturn {
  isSupported: boolean
  isPlatformAvailable: boolean
  hasBiometric: boolean
  credentials: WebAuthnStatus['credentials']
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  registerCredential: (deviceName: string) => Promise<boolean>
  authenticate: () => Promise<boolean>
  deleteCredential: (id: string) => Promise<boolean>
}

export const useWebAuthn = (): UseWebAuthnReturn => {
  const [isSupported, setIsSupported] = useState(false)
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false)
  const [status, setStatus] = useState<WebAuthnStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
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
      }
    } catch (err: any) {
      console.error('[useWebAuthn] Erro:', err)
      setError(err.message || 'Erro ao carregar status')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const registerCredential = useCallback(
    async (deviceName: string): Promise<boolean> => {
      setError(null)

      try {
        await webAuthnService.registerCredential(deviceName)
        await refresh()
        return true
      } catch (err: any) {
        setError(err.message || 'Erro ao registrar')
        return false
      }
    },
    [refresh]
  )

  const authenticate = useCallback(async (): Promise<boolean> => {
    setError(null)

    try {
      const success = await webAuthnService.authenticate()
      return success
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação')
      return false
    }
  }, [])

  const deleteCredential = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null)

      try {
        const success = await webAuthnService.deleteCredential(id)
        if (success) {
          await refresh()
        }
        return success
      } catch (err: any) {
        setError(err.message || 'Erro ao remover')
        return false
      }
    },
    [refresh]
  )

  return {
    isSupported,
    isPlatformAvailable,
    hasBiometric: status?.has_biometric ?? false,
    credentials: status?.credentials ?? [],
    isLoading,
    error,
    refresh,
    registerCredential,
    authenticate,
    deleteCredential,
  }
}

export default useWebAuthn
