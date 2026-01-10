/**
 * PWA Startup Check (iOS + Android)
 * ==================================
 *
 * Script que roda no início para detectar e resolver problemas
 * de tela branca em PWAs (iOS Safari e Android Chrome).
 *
 * DEVE ser importado no main.tsx ANTES do React render.
 */

// ============================================
// STORAGE HELPERS
// ============================================

function checkStorage(): boolean {
  try {
    const storage = globalThis.localStorage
    if (!storage) return false
    const x = '__pwa_test__'
    storage.setItem(x, x)
    storage.removeItem(x)
    return true
  } catch {
    return false
  }
}

let storageOk: boolean | null = null

function hasStorage(): boolean {
  if (storageOk === null) {
    storageOk = checkStorage()
  }
  return storageOk
}

function getItem(key: string): string | null {
  try {
    return hasStorage() ? globalThis.localStorage.getItem(key) : null
  } catch {
    return null
  }
}

function setItem(key: string, value: string): void {
  try {
    if (hasStorage()) globalThis.localStorage.setItem(key, value)
  } catch {
    // Ignora
  }
}

function removeItem(key: string): void {
  try {
    if (hasStorage()) globalThis.localStorage.removeItem(key)
  } catch {
    // Ignora
  }
}

// ============================================
// DETECÇÃO DE AMBIENTE
// ============================================

/**
 * Detecta se está rodando como PWA (standalone)
 */
function isPWAMode(): boolean {
  try {
    if (typeof globalThis.window === 'undefined') return false

    // iOS Safari PWA
    const nav = globalThis.navigator as Navigator & { standalone?: boolean }
    if (nav.standalone === true) return true

    // Android Chrome PWA / outros
    if (globalThis.matchMedia?.('(display-mode: standalone)')?.matches) return true
    if (globalThis.matchMedia?.('(display-mode: fullscreen)')?.matches) return true

    return false
  } catch {
    return false
  }
}

/**
 * Detecta se é iOS
 */
function isIOS(): boolean {
  try {
    const ua = globalThis.navigator?.userAgent?.toLowerCase() || ''
    return /iphone|ipad|ipod/.test(ua)
  } catch {
    return false
  }
}

// ============================================
// CONSTANTES
// ============================================

const STARTUP_KEY = 'wolknow_pwa_startup'
const COUNT_KEY = 'wolknow_pwa_count'

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Limpa todos os caches e recarrega
 */
async function clearAndReload(): Promise<void> {
  console.log('[PWA Startup] Limpando caches...')

  try {
    // 1. Limpar Cache Storage
    if ('caches' in globalThis) {
      const names = await caches.keys()
      await Promise.all(names.map(n => caches.delete(n)))
      console.log('[PWA Startup] Caches limpos:', names.length)
    }
  } catch (e) {
    console.error('[PWA Startup] Erro limpando caches:', e)
  }

  try {
    // 2. Desregistrar Service Workers
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) {
        await reg.unregister()
      }
      console.log('[PWA Startup] SWs desregistrados:', regs.length)
    }
  } catch (e) {
    console.error('[PWA Startup] Erro desregistrando SW:', e)
  }

  // 3. Limpar contadores
  removeItem(STARTUP_KEY)
  removeItem(COUNT_KEY)

  // 4. Reload com parâmetro único
  try {
    const url = new URL(globalThis.location.href)
    url.searchParams.set('_v', Date.now().toString())
    globalThis.location.replace(url.toString())
  } catch {
    globalThis.location.reload()
  }
}

/**
 * Verifica e tenta resolver problemas de inicialização
 */
export function checkPWAStartup(): void {
  // Só executa em modo PWA
  if (!isPWAMode()) {
    console.log('[PWA Startup] Não é PWA, pulando verificação')
    return
  }

  console.log('[PWA Startup] Verificando PWA...', isIOS() ? '(iOS)' : '(Android/Outro)')

  try {
    const now = Date.now()
    const lastStartup = getItem(STARTUP_KEY)
    const count = Number.parseInt(getItem(COUNT_KEY) || '0', 10)

    // Detecta loop de reload (mais de 3 tentativas em 30 segundos)
    if (lastStartup) {
      const elapsed = now - Number.parseInt(lastStartup, 10)

      if (elapsed < 30000) {
        const newCount = count + 1
        setItem(COUNT_KEY, newCount.toString())

        if (newCount >= 3) {
          console.log('[PWA Startup] ⚠️ Loop detectado! Forçando limpeza...')
          void clearAndReload()
          return
        }
      } else {
        // Reset contador após 30 segundos
        setItem(COUNT_KEY, '0')
      }
    }

    // Salva timestamp atual
    setItem(STARTUP_KEY, now.toString())

    // Verifica Service Workers problemáticos
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then(regs => {
          for (const reg of regs) {
            if (reg.waiting) {
              console.log('[PWA Startup] SW esperando, enviando SKIP_WAITING')
              reg.waiting.postMessage({ type: 'SKIP_WAITING' })
            }
          }
        })
        .catch(() => {
          // Ignora erros
        })
    }
  } catch (error) {
    console.error('[PWA Startup] Erro:', error)
  }
}

// Alias para compatibilidade
export const checkIOSPWAStartup = checkPWAStartup

// ============================================
// AUTO-EXECUÇÃO
// ============================================

try {
  checkPWAStartup()
} catch (error) {
  console.error('[PWA Startup] Falha na inicialização:', error)
}
