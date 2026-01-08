/**
 * 🗄️ IndexedDB Storage para iOS Safari
 * =====================================
 *
 * IndexedDB é mais confiável que localStorage no Safari iOS porque:
 * 1. Não é afetado por ITP (Intelligent Tracking Prevention)
 * 2. Não é limpo quando o iOS mata o processo
 * 3. Persiste mesmo em PWA standalone mode
 * 4. Quota maior (50MB+ vs 5MB do localStorage)
 *
 * Esta implementação fornece uma API síncrona-like usando cache em memória
 * com persistência assíncrona no IndexedDB.
 */

const DB_NAME = 'WolkNowAuthDB'
const DB_VERSION = 1
const STORE_NAME = 'auth'

// Cache em memória para acesso síncrono
let memoryCache: Map<string, string> = new Map()
let dbInstance: IDBDatabase | null = null
let isInitialized = false
let initPromise: Promise<void> | null = null

/**
 * Inicializa o IndexedDB
 */
const initDB = (): Promise<void> => {
  if (initPromise) return initPromise

  initPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      console.warn('[IndexedDBStorage] IndexedDB not available')
      resolve()
      return
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('[IndexedDBStorage] Failed to open database:', request.error)
        resolve() // Não rejeitar, apenas continuar sem DB
      }

      request.onsuccess = () => {
        dbInstance = request.result
        isInitialized = true
        console.log('[IndexedDBStorage] ✅ Database initialized')

        // Carregar dados existentes para o cache de memória
        loadAllToMemory().then(resolve).catch(resolve)
      }

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result

        // Criar object store se não existir
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' })
          console.log('[IndexedDBStorage] Object store created')
        }
      }
    } catch (error) {
      console.error('[IndexedDBStorage] Error initializing:', error)
      resolve()
    }
  })

  return initPromise
}

/**
 * Carrega todos os dados do IndexedDB para o cache de memória
 */
const loadAllToMemory = (): Promise<void> => {
  return new Promise(resolve => {
    if (!dbInstance) {
      resolve()
      return
    }

    try {
      const transaction = dbInstance.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const items = request.result as Array<{ key: string; value: string }>
        items.forEach(item => {
          memoryCache.set(item.key, item.value)
        })
        console.log(`[IndexedDBStorage] Loaded ${items.length} items to memory cache`)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDBStorage] Error loading to memory:', request.error)
        resolve()
      }
    } catch (error) {
      console.error('[IndexedDBStorage] Error in loadAllToMemory:', error)
      resolve()
    }
  })
}

/**
 * Salva um valor no IndexedDB (assíncrono)
 */
const saveToIndexedDB = (key: string, value: string): Promise<void> => {
  return new Promise(resolve => {
    if (!dbInstance) {
      resolve()
      return
    }

    try {
      const transaction = dbInstance.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put({ key, value })

      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.error('[IndexedDBStorage] Error saving:', request.error)
        resolve()
      }
    } catch (error) {
      console.error('[IndexedDBStorage] Error in saveToIndexedDB:', error)
      resolve()
    }
  })
}

/**
 * Remove um valor do IndexedDB (assíncrono)
 */
const removeFromIndexedDB = (key: string): Promise<void> => {
  return new Promise(resolve => {
    if (!dbInstance) {
      resolve()
      return
    }

    try {
      const transaction = dbInstance.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.error('[IndexedDBStorage] Error removing:', request.error)
        resolve()
      }
    } catch (error) {
      console.error('[IndexedDBStorage] Error in removeFromIndexedDB:', error)
      resolve()
    }
  })
}

/**
 * API pública - Storage baseado em IndexedDB com cache em memória
 */
export const indexedDBStorage = {
  /**
   * Inicializa o storage - DEVE ser chamado no início do app
   */
  async init(): Promise<void> {
    await initDB()
  },

  /**
   * Verifica se está inicializado
   */
  isReady(): boolean {
    return isInitialized
  },

  /**
   * Obtém um valor (síncrono via cache de memória)
   */
  getItem(key: string): string | null {
    return memoryCache.get(key) ?? null
  },

  /**
   * Obtém um valor de forma assíncrona (garante dados do IndexedDB)
   */
  async getItemAsync(key: string): Promise<string | null> {
    // Primeiro verificar memória
    const cached = memoryCache.get(key)
    if (cached !== undefined) return cached

    // Se não inicializado, esperar
    if (!isInitialized) {
      await initDB()
    }

    // Tentar buscar do IndexedDB diretamente
    if (!dbInstance) return null

    return new Promise(resolve => {
      try {
        const transaction = dbInstance!.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(key)

        request.onsuccess = () => {
          const result = request.result as { key: string; value: string } | undefined
          if (result) {
            memoryCache.set(key, result.value)
            resolve(result.value)
          } else {
            resolve(null)
          }
        }

        request.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  },

  /**
   * Define um valor (atualiza memória imediatamente, persiste em background)
   */
  setItem(key: string, value: string): void {
    // Atualizar memória imediatamente (síncrono)
    memoryCache.set(key, value)

    // Persistir em background (assíncrono)
    saveToIndexedDB(key, value).catch(console.error)

    // Também salvar em localStorage como backup
    try {
      localStorage.setItem(`idb_backup_${key}`, value)
    } catch {
      // Ignorar erros de localStorage
    }
  },

  /**
   * Remove um valor
   */
  removeItem(key: string): void {
    memoryCache.delete(key)
    removeFromIndexedDB(key).catch(console.error)

    try {
      localStorage.removeItem(`idb_backup_${key}`)
    } catch {
      // Ignorar
    }
  },

  /**
   * Limpa todos os dados
   */
  async clear(): Promise<void> {
    memoryCache.clear()

    if (dbInstance) {
      return new Promise(resolve => {
        try {
          const transaction = dbInstance!.transaction(STORE_NAME, 'readwrite')
          const store = transaction.objectStore(STORE_NAME)
          const request = store.clear()
          request.onsuccess = () => resolve()
          request.onerror = () => resolve()
        } catch {
          resolve()
        }
      })
    }
  },

  /**
   * Recupera dados do localStorage backup se IndexedDB falhar
   */
  async recoverFromBackup(): Promise<void> {
    if (memoryCache.size > 0) return // Já tem dados

    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('idb_backup_'))
      for (const backupKey of keys) {
        const key = backupKey.replace('idb_backup_', '')
        const value = localStorage.getItem(backupKey)
        if (value) {
          memoryCache.set(key, value)
          // Resalvar no IndexedDB
          await saveToIndexedDB(key, value)
        }
      }
      if (keys.length > 0) {
        console.log(`[IndexedDBStorage] Recovered ${keys.length} items from backup`)
      }
    } catch {
      // Ignorar
    }
  },
}

// Chaves específicas para autenticação
export const AUTH_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  TIMESTAMP: 'auth_timestamp',
  REFRESH_TOKEN: 'auth_refresh_token',
} as const

/**
 * API específica para autenticação
 */
export const authStorage = {
  async init(): Promise<void> {
    await indexedDBStorage.init()
    await indexedDBStorage.recoverFromBackup()
  },

  // Token de acesso
  getToken(): string | null {
    return indexedDBStorage.getItem(AUTH_KEYS.TOKEN)
  },

  async getTokenAsync(): Promise<string | null> {
    return indexedDBStorage.getItemAsync(AUTH_KEYS.TOKEN)
  },

  setToken(token: string): void {
    indexedDBStorage.setItem(AUTH_KEYS.TOKEN, token)
    indexedDBStorage.setItem(AUTH_KEYS.TIMESTAMP, Date.now().toString())
  },

  removeToken(): void {
    indexedDBStorage.removeItem(AUTH_KEYS.TOKEN)
    indexedDBStorage.removeItem(AUTH_KEYS.TIMESTAMP)
  },

  // Timestamp do login
  getLoginTimestamp(): number {
    const ts = indexedDBStorage.getItem(AUTH_KEYS.TIMESTAMP)
    return ts ? Number.parseInt(ts, 10) : 0
  },

  // User data
  getUser<T>(): T | null {
    const data = indexedDBStorage.getItem(AUTH_KEYS.USER)
    if (!data) return null
    try {
      return JSON.parse(data) as T
    } catch {
      return null
    }
  },

  setUser<T>(user: T): void {
    indexedDBStorage.setItem(AUTH_KEYS.USER, JSON.stringify(user))
  },

  removeUser(): void {
    indexedDBStorage.removeItem(AUTH_KEYS.USER)
  },

  // Limpar tudo
  async clearAll(): Promise<void> {
    indexedDBStorage.removeItem(AUTH_KEYS.TOKEN)
    indexedDBStorage.removeItem(AUTH_KEYS.USER)
    indexedDBStorage.removeItem(AUTH_KEYS.TIMESTAMP)
    indexedDBStorage.removeItem(AUTH_KEYS.REFRESH_TOKEN)
  },

  // Verificar se acabou de logar (grace period)
  isWithinGracePeriod(seconds: number = 15): boolean {
    const timestamp = this.getLoginTimestamp()
    if (!timestamp) return false
    const elapsed = Date.now() - timestamp
    return elapsed < seconds * 1000
  },
}

export default indexedDBStorage
