/**
 * 🔄 PWA Update Hook - WOLK NOW
 * ==============================
 *
 * Hook profissional para gerenciar atualizações do PWA.
 * Resolve o problema de tela branca após deploys.
 *
 * ATUALIZAÇÃO AUTOMÁTICA:
 * - Verifica version.json a cada 30 segundos
 * - Força reload quando detecta nova versão
 * - Limpa caches automaticamente
 */

import { useEffect, useCallback, useState } from 'react'

// Versão do app (definida no build)
const APP_VERSION = import.meta.env.VITE_APP_VERSION || Date.now().toString()

// Chaves no localStorage
const VERSION_KEY = 'wolknow_app_version'
const LAST_CHECK_KEY = 'wolknow_last_update_check'
const SERVER_VERSION_KEY = 'wolknow_server_version'

// Intervalo de verificação (30 segundos)
const CHECK_INTERVAL = 30 * 1000

// Verifica se localStorage está disponível
const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__pwa_update_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

// Safe localStorage helpers
const safeGetItem = (key: string): string | null => {
  try {
    return isLocalStorageAvailable() ? localStorage.getItem(key) : null
  } catch {
    return null
  }
}

const safeSetItem = (key: string, value: string): void => {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.setItem(key, value)
    }
  } catch {
    // Silently fail
  }
}

const safeRemoveItem = (key: string): void => {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(key)
    }
  } catch {
    // Silently fail
  }
}

interface PWAUpdateState {
  needRefresh: boolean
  offlineReady: boolean
  checking: boolean
}

interface VersionInfo {
  version: string
  buildTime: string
  hash: string
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
    checking: false,
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

    safeSetItem(VERSION_KEY, APP_VERSION)
    safeSetItem(LAST_CHECK_KEY, Date.now().toString())

    globalThis.location.reload()
  }, [clearAllCaches, unregisterOldSW])

  // 🆕 Verificar version.json do servidor
  const checkServerVersion = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, checking: true }))

      // Adiciona timestamp para evitar cache
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })

      if (!response.ok) {
        console.log('[PWA] version.json não encontrado (ainda em dev?)')
        return false
      }

      const serverVersion: VersionInfo = await response.json()
      const storedServerVersion = safeGetItem(SERVER_VERSION_KEY)

      console.log('[PWA] Versão servidor:', serverVersion.version, '| Local:', storedServerVersion)

      if (storedServerVersion && storedServerVersion !== serverVersion.version) {
        console.log('[PWA] 🚀 Nova versão detectada! Atualizando...')
        safeSetItem(SERVER_VERSION_KEY, serverVersion.version)

        // Aguarda um pouco para o usuário ver a mensagem (se houver UI)
        setTimeout(async () => {
          await clearAllCaches()
          await unregisterOldSW()
          globalThis.location.reload()
        }, 500)

        return true
      }

      // Salva versão se é primeira vez
      if (!storedServerVersion) {
        safeSetItem(SERVER_VERSION_KEY, serverVersion.version)
      }

      return false
    } catch (error) {
      // Silencia erro em desenvolvimento (version.json não existe)
      if (!import.meta.env.DEV) {
        console.error('[PWA] Erro ao verificar versão:', error)
      }
      return false
    } finally {
      setState(prev => ({ ...prev, checking: false }))
    }
  }, [clearAllCaches, unregisterOldSW])

  // Verificar se há nova versão
  const checkVersion = useCallback((): boolean => {
    const storedVersion = safeGetItem(VERSION_KEY)

    if (!storedVersion) {
      safeSetItem(VERSION_KEY, APP_VERSION)
      return false
    }

    if (storedVersion !== APP_VERSION) {
      console.log('[PWA] Nova versão:', APP_VERSION, '| Anterior:', storedVersion)
      return true
    }

    return false
  }, [])

  // Setup do Service Worker
  // NOTA: O VitePWA com registerType: 'autoUpdate' já registra o SW automaticamente
  // Este hook apenas monitora atualizações e oferece funções auxiliares
  // Em desenvolvimento, o SW está desabilitado para evitar problemas
  useEffect(() => {
    // Verificar se Service Worker é suportado e se não estamos em desenvolvimento
    const isDev = import.meta.env.DEV
    if (!('serviceWorker' in navigator) || isDev) {
      if (isDev) console.log('[PWA] Service Worker desabilitado em desenvolvimento')
      return
    }

    // Verificar se há nova versão
    if (checkVersion()) {
      console.log('[PWA] Atualizando app...')
      const timer = setTimeout(forceUpdate, 500)
      return () => clearTimeout(timer)
    }

    let intervalId: ReturnType<typeof setInterval>

    const initSW = async () => {
      try {
        // Aguardar o SW já registrado pelo VitePWA (não registrar manualmente)
        const registration = await navigator.serviceWorker.ready
        console.log('[PWA] SW pronto:', registration.scope)

        // Verificar atualizações a cada 5 minutos
        intervalId = setInterval(
          () => {
            registration.update().catch(console.error)
          },
          5 * 60 * 1000
        )

        // Escutar novas versões
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
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
        console.error('[PWA] Erro ao aguardar SW:', error)
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
  }, [checkVersion, forceUpdate])

  // Verificar ao voltar para a aba
  useEffect(() => {
    // Não executar em desenvolvimento
    if (import.meta.env.DEV) return

    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return

      const lastCheck = safeGetItem(LAST_CHECK_KEY)
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000

      if (!lastCheck || now - Number.parseInt(lastCheck, 10) > fiveMinutes) {
        safeSetItem(LAST_CHECK_KEY, now.toString())
        await checkForSWUpdates()
        // Também verifica version.json
        await checkServerVersion()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [checkServerVersion])

  // 🆕 Verificação automática periódica do version.json
  useEffect(() => {
    // Não executar em desenvolvimento
    if (import.meta.env.DEV) return

    // Verificar imediatamente ao carregar
    checkServerVersion()

    // Verificar a cada 30 segundos
    const intervalId = setInterval(() => {
      checkServerVersion()
    }, CHECK_INTERVAL)

    console.log(`[PWA] Auto-update ativo (verificando a cada ${CHECK_INTERVAL / 1000}s)`)

    return () => clearInterval(intervalId)
  }, [checkServerVersion])

  return {
    ...state,
    forceUpdate,
    clearAllCaches,
    checkVersion,
    checkServerVersion,
    appVersion: APP_VERSION,
  }
}

export default usePWAUpdate
