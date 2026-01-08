/**
 * 🍎 iOS Safari Compatibility Utilities
 * =====================================
 *
 * Utilitários para garantir compatibilidade com Safari iOS versões 12-17+
 * Lida com as peculiaridades de storage, PWA e autenticação no Safari.
 */

// Detecta versão do iOS
export const getIOSVersion = (): number | null => {
  if (typeof navigator === 'undefined') return null

  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

// Detecta se é Safari
export const isSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android')
}

// Detecta se é iOS (iPhone/iPad)
export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

// Detecta se está rodando como PWA/WebApp
export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

// Detecta se é Safari iOS em modo PWA
export const isSafariIOSPWA = (): boolean => {
  return isSafari() && isIOS() && isStandalone()
}

// Verifica se localStorage está disponível e funcionando
export const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__safari_test__'
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

// Verifica se sessionStorage está disponível e funcionando
export const isSessionStorageAvailable = (): boolean => {
  try {
    const testKey = '__safari_test__'
    sessionStorage.setItem(testKey, testKey)
    sessionStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Storage híbrido para Safari iOS
 * Usa localStorage como primário e sessionStorage como fallback
 * Em caso de falha, usa memória
 */
class SafariHybridStorage {
  private memoryStorage: Map<string, string> = new Map()
  private storageAvailable: boolean
  private sessionAvailable: boolean

  constructor() {
    this.storageAvailable = isLocalStorageAvailable()
    this.sessionAvailable = isSessionStorageAvailable()

    if (!this.storageAvailable) {
      console.warn('[SafariHybridStorage] localStorage not available, using fallbacks')
    }
  }

  getItem(key: string): string | null {
    try {
      // Tentar localStorage primeiro
      if (this.storageAvailable) {
        const value = localStorage.getItem(key)
        if (value !== null) return value
      }

      // Fallback para sessionStorage
      if (this.sessionAvailable) {
        const value = sessionStorage.getItem(key)
        if (value !== null) return value
      }

      // Último fallback: memória
      return this.memoryStorage.get(key) ?? null
    } catch (e) {
      console.warn('[SafariHybridStorage] getItem error:', e)
      return this.memoryStorage.get(key) ?? null
    }
  }

  setItem(key: string, value: string): void {
    // Sempre salvar em memória
    this.memoryStorage.set(key, value)

    try {
      // Tentar localStorage
      if (this.storageAvailable) {
        localStorage.setItem(key, value)
      }

      // Também salvar em sessionStorage como backup
      if (this.sessionAvailable) {
        sessionStorage.setItem(key, value)
      }
    } catch (e) {
      console.warn('[SafariHybridStorage] setItem error:', e)
      // Já está salvo em memória
    }
  }

  removeItem(key: string): void {
    this.memoryStorage.delete(key)

    try {
      if (this.storageAvailable) {
        localStorage.removeItem(key)
      }
      if (this.sessionAvailable) {
        sessionStorage.removeItem(key)
      }
    } catch (e) {
      console.warn('[SafariHybridStorage] removeItem error:', e)
    }
  }

  // Sincroniza dados do sessionStorage para localStorage
  // Útil após o Safari "acordar" e localStorage ficar disponível
  syncFromSession(): void {
    if (!this.sessionAvailable || !this.storageAvailable) return

    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('hold-wallet')) {
          const value = sessionStorage.getItem(key)
          if (value) {
            localStorage.setItem(key, value)
          }
        }
      }
      console.log('[SafariHybridStorage] Synced from sessionStorage to localStorage')
    } catch (e) {
      console.warn('[SafariHybridStorage] Sync error:', e)
    }
  }
}

// Instância singleton
export const safariStorage = new SafariHybridStorage()

/**
 * Função para inicializar compatibilidade Safari iOS no app
 * Deve ser chamada no início do app (App.tsx ou main.tsx)
 */
export const initSafariIOSCompat = (): void => {
  const iosVersion = getIOSVersion()
  const isPWA = isStandalone()
  const safari = isSafari()

  console.log('[SafariIOSCompat] Initializing...', {
    isIOS: isIOS(),
    isSafari: safari,
    isStandalone: isPWA,
    iosVersion,
    localStorageAvailable: isLocalStorageAvailable(),
    sessionStorageAvailable: isSessionStorageAvailable(),
  })

  // Para Safari iOS PWA, fazer sync de storage quando a página fica visível
  if (safari && isIOS()) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('[SafariIOSCompat] Page became visible, syncing storage...')
        safariStorage.syncFromSession()
      }
    })

    // Também fazer sync no pageshow (quando volta de background no iOS)
    window.addEventListener('pageshow', event => {
      if (event.persisted) {
        console.log('[SafariIOSCompat] Page restored from cache, syncing storage...')
        safariStorage.syncFromSession()
      }
    })
  }

  // Workaround para iOS 12-14 que tem problemas com Promise em Service Worker
  if (iosVersion && iosVersion < 15) {
    console.log('[SafariIOSCompat] iOS < 15 detected, applying older iOS fixes')
    // Desabilitar SW para versões muito antigas
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then(registrations => {
          if (iosVersion < 13) {
            console.log('[SafariIOSCompat] Unregistering SW for iOS < 13')
            registrations.forEach(registration => registration.unregister())
          }
        })
        .catch(() => {
          // Ignorar erros
        })
    }
  }
}

/**
 * Hook-friendly: Retorna estado de compatibilidade Safari
 */
export const getSafariCompatInfo = () => ({
  isIOS: isIOS(),
  isSafari: isSafari(),
  isStandalone: isStandalone(),
  isSafariIOSPWA: isSafariIOSPWA(),
  iosVersion: getIOSVersion(),
  localStorageAvailable: isLocalStorageAvailable(),
  sessionStorageAvailable: isSessionStorageAvailable(),
})
