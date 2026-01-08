/**
 * Safari-safe localStorage wrapper
 *
 * Safari (especialmente em modo PWA/WebApp) pode ter problemas com
 * localStorage durante a inicialização. Este wrapper adiciona try-catch
 * para evitar erros silenciosos que impedem a aplicação de funcionar.
 *
 * Problemas conhecidos no Safari:
 * 1. localStorage pode não estar disponível imediatamente no PWA mode
 * 2. Quota exceeded errors em private mode
 * 3. SecurityError quando localStorage está bloqueado
 */

export const safariSafeStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null
      }
      return localStorage.getItem(name)
    } catch (e) {
      console.warn('[SafariStorage] getItem error:', e)
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return
      }
      localStorage.setItem(name, value)
    } catch (e) {
      console.warn('[SafariStorage] setItem error:', e)
    }
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return
      }
      localStorage.removeItem(name)
    } catch (e) {
      console.warn('[SafariStorage] removeItem error:', e)
    }
  },
}

/**
 * Detecta se o navegador é Safari
 */
export const isSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

/**
 * Detecta se está rodando como PWA (standalone)
 */
export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

/**
 * Detecta se é Safari rodando como PWA
 */
export const isSafariPWA = (): boolean => {
  return isSafari() && isPWA()
}

/**
 * Lê um valor do localStorage de forma segura
 * Retorna o defaultValue se houver erro ou valor não existir
 */
export function safeLocalStorageGet<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return defaultValue
    }
    const value = localStorage.getItem(key)
    if (value === null) {
      return defaultValue
    }
    return JSON.parse(value) as T
  } catch (e) {
    console.warn(`[SafariStorage] Error reading ${key}:`, e)
    return defaultValue
  }
}

/**
 * Escreve um valor no localStorage de forma segura
 */
export function safeLocalStorageSet<T>(key: string, value: T): boolean {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false
    }
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.warn(`[SafariStorage] Error writing ${key}:`, e)
    return false
  }
}
