/**
 * iOS PWA Startup Check
 * =========================
 *
 * Script que roda no início para detectar e resolver problemas
 * de tela branca no iOS Safari PWA.
 *
 * DEVE ser importado no main.tsx antes do React render.
 */

// Detecta se é iOS PWA
const isIOSPWA = (): boolean => {
  if (globalThis.window === undefined) return false
  const userAgent = globalThis.navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(userAgent)
  const isStandalone =
    (globalThis.navigator as Navigator & { standalone?: boolean }).standalone === true
  const isDisplayModeStandalone = globalThis.matchMedia('(display-mode: standalone)').matches
  return isIOS && (isStandalone || isDisplayModeStandalone)
}

// Chave para detectar loop de reload
const STARTUP_KEY = 'wolknow_ios_startup'
const STARTUP_COUNT_KEY = 'wolknow_ios_startup_count'

// Função principal de verificação
export const checkIOSPWAStartup = (): void => {
  if (!isIOSPWA()) return

  console.log('[iOS PWA Startup] Verificando estado do PWA...')

  const now = Date.now()
  const lastStartup = localStorage.getItem(STARTUP_KEY)
  const startupCount = Number.parseInt(localStorage.getItem(STARTUP_COUNT_KEY) || '0', 10)

  // Se teve mais de 3 tentativas em 30 segundos, limpa tudo
  if (lastStartup && now - Number.parseInt(lastStartup, 10) < 30000) {
    const newCount = startupCount + 1
    localStorage.setItem(STARTUP_COUNT_KEY, newCount.toString())

    if (newCount >= 3) {
      console.log('[iOS PWA Startup] ⚠️ Detectado loop de reload! Limpando caches...')
      clearAllAndReload()
      return
    }
  } else {
    // Reset contador se passou mais de 30 segundos
    localStorage.setItem(STARTUP_COUNT_KEY, '0')
  }

  // Salva timestamp do startup
  localStorage.setItem(STARTUP_KEY, now.toString())

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
}

// Limpa tudo e recarrega (último recurso)
const clearAllAndReload = async (): Promise<void> => {
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
  localStorage.removeItem(STARTUP_KEY)
  localStorage.removeItem(STARTUP_COUNT_KEY)

  // 4. Reload forçado
  const url = new URL(globalThis.location.href)
  url.searchParams.set('force', Date.now().toString())
  globalThis.location.replace(url.toString())
}

// Auto-executa ao importar
checkIOSPWAStartup()
