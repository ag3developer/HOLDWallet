/**
 * iOS PWA Startup Check
 * =========================
 *
 * Script que roda no início para detectar e resolver problemas
 * de tela branca no iOS Safari PWA.
 *
 * DEVE ser importado no main.tsx antes do React render.
 */

// Verifica se localStorage está disponível
const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__ios_pwa_test__'
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

// Detecta se é iOS PWA
const isIOSPWA = (): boolean => {
  try {
    if (globalThis.window === undefined) return false
    const userAgent = globalThis.navigator?.userAgent?.toLowerCase() || ''
    const isIOS = /iphone|ipad|ipod/.test(userAgent)
    const isStandalone =
      (globalThis.navigator as Navigator & { standalone?: boolean }).standalone === true
    const isDisplayModeStandalone =
      globalThis.matchMedia?.('(display-mode: standalone)')?.matches || false
    return isIOS && (isStandalone || isDisplayModeStandalone)
  } catch {
    return false
  }
}

// Chave para detectar loop de reload
const STARTUP_KEY = 'wolknow_ios_startup'
const STARTUP_COUNT_KEY = 'wolknow_ios_startup_count'

// Função principal de verificação
export const checkIOSPWAStartup = (): void => {
  try {
    if (!isIOSPWA()) return

    console.log('[iOS PWA Startup] Verificando estado do PWA...')

    const now = Date.now()
    const lastStartup = safeGetItem(STARTUP_KEY)
    const startupCount = Number.parseInt(safeGetItem(STARTUP_COUNT_KEY) || '0', 10)

    // Se teve mais de 3 tentativas em 30 segundos, limpa tudo
    if (lastStartup && now - Number.parseInt(lastStartup, 10) < 30000) {
      const newCount = startupCount + 1
      safeSetItem(STARTUP_COUNT_KEY, newCount.toString())

      if (newCount >= 3) {
        console.log('[iOS PWA Startup] ⚠️ Detectado loop de reload! Limpando caches...')
        clearAllAndReload()
        return
      }
    } else {
      // Reset contador se passou mais de 30 segundos
      safeSetItem(STARTUP_COUNT_KEY, '0')
    }

    // Salva timestamp do startup
    safeSetItem(STARTUP_KEY, now.toString())

    // Verifica se há Service Worker com estado problemático
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then(registrations => {
          for (const reg of registrations) {
            // Se tem SW esperando há muito tempo, força atualização
            if (reg.waiting) {
              console.log('[iOS PWA Startup] SW waiting detectado, enviando SKIP_WAITING')
              reg.waiting.postMessage({ type: 'SKIP_WAITING' })
            }
          }
        })
        .catch(err => {
          console.error('[iOS PWA Startup] Erro ao verificar SW:', err)
        })
    }
  } catch (error) {
    console.error('[iOS PWA Startup] Erro crítico:', error)
    // Não lança exceção para não quebrar a app
  }
}

// Limpa tudo e recarrega (último recurso)
const clearAllAndReload = async (): Promise<void> => {
  try {
    // 1. Limpar caches
    if ('caches' in globalThis) {
      try {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      } catch (e) {
        console.error('[iOS PWA Startup] Erro ao limpar caches:', e)
      }
    }

    // 2. Desregistrar SWs
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) {
          await reg.unregister()
        }
      } catch (e) {
        console.error('[iOS PWA Startup] Erro ao desregistrar SW:', e)
      }
    }

    // 3. Limpar contadores
    safeRemoveItem(STARTUP_KEY)
    safeRemoveItem(STARTUP_COUNT_KEY)

    // 4. Reload forçado
    const url = new URL(globalThis.location.href)
    url.searchParams.set('force', Date.now().toString())
    globalThis.location.replace(url.toString())
  } catch (error) {
    console.error('[iOS PWA Startup] Erro em clearAllAndReload:', error)
    // Tenta reload simples como fallback
    try {
      globalThis.location.reload()
    } catch {
      // Último recurso - não faz nada para não crashar
    }
  }
}

// Auto-executa ao importar (com proteção contra erros)
try {
  checkIOSPWAStartup()
} catch (error) {
  console.error('[iOS PWA Startup] Erro na inicialização:', error)
}
