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

// Cache em memória para quando localStorage falha
const memoryCache: Map<string, string> = new Map()

// Cache do resultado do teste de localStorage (undefined = não testado ainda)
let storageAvailableCache: boolean | undefined = undefined

// Verifica se localStorage está disponível de forma 100% segura
// O resultado é cacheado para evitar testes repetidos (causa lentidão no Safari Mobile)
const isStorageAvailable = (): boolean => {
  // Retorna resultado cacheado se já testou
  if (storageAvailableCache !== undefined) {
    return storageAvailableCache
  }

  try {
    if (typeof globalThis === 'undefined') {
      storageAvailableCache = false
      return false
    }
    if (typeof globalThis.localStorage === 'undefined') {
      storageAvailableCache = false
      return false
    }
    // Teste real de escrita/leitura (executado apenas uma vez)
    const testKey = '__storage_test__'
    globalThis.localStorage.setItem(testKey, testKey)
    globalThis.localStorage.removeItem(testKey)
    storageAvailableCache = true
    return true
  } catch {
    storageAvailableCache = false
    return false
  }
}

export const safariSafeStorage = {
  getItem: (name: string): string | null => {
    try {
      if (isStorageAvailable()) {
        return globalThis.localStorage.getItem(name)
      }
    } catch {
      // Ignora erro
    }
    // Fallback para memória
    return memoryCache.get(name) ?? null
  },
  setItem: (name: string, value: string): void => {
    // Sempre salva em memória primeiro
    memoryCache.set(name, value)
    try {
      if (isStorageAvailable()) {
        globalThis.localStorage.setItem(name, value)
      }
    } catch {
      // Ignora erro - já está em memória
    }
  },
  removeItem: (name: string): void => {
    memoryCache.delete(name)
    try {
      if (isStorageAvailable()) {
        globalThis.localStorage.removeItem(name)
      }
    } catch {
      // Ignora erro
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
