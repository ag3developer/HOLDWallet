/**
 * 🔄 PWA Update Hook - WOLK NOW
 * ==============================
 *
 * Hook profissional para gerenciar atualizações do PWA.
 * Resolve o problema de tela branca após deploys.
 */

import { useEffect, useCallback, useState } from 'react'

// Versão do app (atualizada automaticamente pelo build)
const APP_VERSION = import.meta.env.VITE_APP_VERSION || Date.now().toString()

// Chaves no localStorage
const VERSION_KEY = 'wolknow_app_version'
const LAST_CHECK_KEY = 'wolknow_last_update_check'

interface PWAUpdateState {
  needRefresh: boolean
  offlineReady: boolean
}

// Função auxiliar para atualizar registrations
async function checkForSWUpdates(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registrations = await navigator.serviceWorker.getRegistrations()
  for (const reg of registrations) {
    await reg.update()
  }
}

export function usePWAUpdate() {
  const [state, setState] = useState<PWAUpdateState>({
    needRefresh: false,
    offlineReady: false,
  })

  // Limpar todos os caches
  const clearAllCaches = useCallback(async (): Promise<boolean> => {
    if (!('caches' in globalThis)) return false

    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      console.log('[PWA] Caches limpos:', cacheNames.length)
      return true
    } catch (error) {
      console.error('[PWA] Erro ao limpar caches:', error)
      return false
    }
  }, [])

  // Desregistrar Service Workers antigos
  const unregisterOldSW = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) return false

    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of registrations) {
        await reg.unregister()
      }
      console.log('[PWA] Service Workers desregistrados:', registrations.length)
      return true
    } catch (error) {
      console.error('[PWA] Erro ao desregistrar SW:', error)
      return false
    }
  }, [])

  // Forçar atualização completa
  const forceUpdate = useCallback(async (): Promise<void> => {
    console.log('[PWA] Forçando atualização...')

    await clearAllCaches()
    await unregisterOldSW()

    localStorage.setItem(VERSION_KEY, APP_VERSION)
    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString())

    globalThis.location.reload()
  }, [clearAllCaches, unregisterOldSW])

  // Verificar se há nova versão
  const checkVersion = useCallback((): boolean => {
    const storedVersion = localStorage.getItem(VERSION_KEY)

    if (!storedVersion) {
      localStorage.setItem(VERSION_KEY, APP_VERSION)
      return false
    }

    if (storedVersion !== APP_VERSION) {
      console.log('[PWA] Nova versão:', APP_VERSION, '| Anterior:', storedVersion)
      return true
    }

    return false
  }, [])

  // Setup do Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Verificar se há nova versão
    if (checkVersion()) {
      console.log('[PWA] Atualizando app...')
      const timer = setTimeout(forceUpdate, 500)
      return () => clearTimeout(timer)
    }

    // Registrar SW
    let intervalId: ReturnType<typeof setInterval>

    const initSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        console.log('[PWA] SW registrado:', reg.scope)

        // Verificar atualizações a cada 5 minutos
        intervalId = setInterval(
          () => {
            reg.update().catch(console.error)
          },
          5 * 60 * 1000
        )

        // Escutar novas versões
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] Nova versão pronta!')
              setState(prev => ({ ...prev, needRefresh: true }))
              newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
      } catch (error) {
        console.error('[PWA] Erro no registro:', error)
        await clearAllCaches()
      }
    }

    initSW()

    // Recarregar quando controller mudar
    const onControllerChange = () => {
      console.log('[PWA] Novo controller, recarregando...')
      globalThis.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      if (intervalId) clearInterval(intervalId)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [checkVersion, forceUpdate, clearAllCaches])

  // Verificar ao voltar para a aba
  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return

      const lastCheck = localStorage.getItem(LAST_CHECK_KEY)
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000

      if (!lastCheck || now - Number.parseInt(lastCheck, 10) > fiveMinutes) {
        localStorage.setItem(LAST_CHECK_KEY, now.toString())
        await checkForSWUpdates()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  return {
    ...state,
    forceUpdate,
    clearAllCaches,
    checkVersion,
    appVersion: APP_VERSION,
  }
}

export default usePWAUpdate
