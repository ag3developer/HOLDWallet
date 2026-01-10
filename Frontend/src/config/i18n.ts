/**
 * 🌍 i18n Configuration - PWA Compatible (iOS + Android)
 * ======================================================
 *
 * Configuração 100% síncrona e defensiva para funcionar em:
 * - Safari iOS PWA (standalone mode) ✅
 * - Android PWA (Chrome/Firefox) ✅
 * - Safari iOS browser ✅
 * - Chrome/Firefox desktop e mobile ✅
 *
 * IMPORTANTE: Inicialização SÍNCRONA sem promises que podem falhar
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Importar traduções diretamente (bundled - sem lazy loading)
import ptBR from '@/locales/pt-BR.json'
import enUS from '@/locales/en-US.json'
import esES from '@/locales/es-ES.json'
import zhCN from '@/locales/zh-CN.json'
import jaJP from '@/locales/ja-JP.json'
import koKR from '@/locales/ko-KR.json'

// ============================================
// CONSTANTES
// ============================================

const LANGUAGE_KEY = 'wolknow_lang'
const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US', 'es-ES', 'zh-CN', 'ja-JP', 'ko-KR'] as const
const DEFAULT_LANGUAGE = 'pt-BR'

// ============================================
// STORAGE HELPERS (PWA Safe - Síncrono)
// ============================================

/**
 * Verifica se storage está disponível
 * Funciona em PWA iOS/Android
 */
function checkStorageAvailable(): boolean {
  try {
    const storage = globalThis.localStorage
    if (!storage) return false
    const x = '__storage_test__'
    storage.setItem(x, x)
    storage.removeItem(x)
    return true
  } catch {
    return false
  }
}

// Cache do resultado para não testar repetidamente
let storageAvailable: boolean | null = null

function isStorageAvailable(): boolean {
  if (storageAvailable === null) {
    storageAvailable = checkStorageAvailable()
  }
  return storageAvailable
}

/**
 * Obtém valor do storage de forma segura
 */
function safeGetItem(key: string): string | null {
  try {
    if (!isStorageAvailable()) return null
    return globalThis.localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Salva valor no storage de forma segura
 */
function safeSetItem(key: string, value: string): void {
  try {
    if (!isStorageAvailable()) return
    globalThis.localStorage.setItem(key, value)
  } catch {
    // Falha silenciosa
  }
}

// ============================================
// DETECÇÃO DE IDIOMA
// ============================================

/**
 * Detecta idioma do navegador
 */
function detectBrowserLanguage(): string {
  try {
    const nav = globalThis.navigator
    if (!nav) return DEFAULT_LANGUAGE

    const browserLang = nav.language || (nav as { userLanguage?: string }).userLanguage || ''
    const lang = browserLang.toLowerCase()

    if (lang.startsWith('pt')) return 'pt-BR'
    if (lang.startsWith('en')) return 'en-US'
    if (lang.startsWith('es')) return 'es-ES'
    if (lang.startsWith('zh')) return 'zh-CN'
    if (lang.startsWith('ja')) return 'ja-JP'
    if (lang.startsWith('ko')) return 'ko-KR'

    return DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

/**
 * Obtém o idioma inicial de forma síncrona e segura
 */
function getInitialLanguage(): string {
  try {
    // 1. Tenta do localStorage
    const saved = safeGetItem(LANGUAGE_KEY)
    if (saved && SUPPORTED_LANGUAGES.includes(saved as (typeof SUPPORTED_LANGUAGES)[number])) {
      return saved
    }

    // 2. Tenta do i18nextLng (compatibilidade)
    const i18nextLng = safeGetItem('i18nextLng')
    if (
      i18nextLng &&
      SUPPORTED_LANGUAGES.includes(i18nextLng as (typeof SUPPORTED_LANGUAGES)[number])
    ) {
      return i18nextLng
    }

    // 3. Detecta do navegador
    return detectBrowserLanguage()
  } catch {
    return DEFAULT_LANGUAGE
  }
}

// ============================================
// RECURSOS DE TRADUÇÃO
// ============================================

const resources = {
  'pt-BR': { translation: ptBR },
  'en-US': { translation: enUS },
  'es-ES': { translation: esES },
  'zh-CN': { translation: zhCN },
  'ja-JP': { translation: jaJP },
  'ko-KR': { translation: koKR },
}

// ============================================
// INICIALIZAÇÃO SÍNCRONA DO i18next
// ============================================

const initialLanguage = getInitialLanguage()

// Log para debug
if (typeof console !== 'undefined') {
  console.log('[i18n] Inicializando com idioma:', initialLanguage)
}

// Configuração do i18next - SÍNCRONA
i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,

  // CRÍTICO: Desabilita debug em produção
  debug: false,

  // Interpolação
  interpolation: {
    escapeValue: false,
  },

  // React - CRÍTICO: useSuspense DEVE ser false para PWA
  react: {
    useSuspense: false,
    bindI18n: 'languageChanged',
    bindI18nStore: '',
  },

  // Namespace
  defaultNS: 'translation',
  ns: ['translation'],

  // Carregamento
  load: 'currentOnly',

  // Desabilita features que podem causar problemas
  saveMissing: false,
  updateMissing: false,

  // Retorno
  returnEmptyString: false,
  returnNull: false,

  // CRÍTICO: Inicialização SÍNCRONA
  initImmediate: true,

  // Não usa backend (tudo bundled)
  partialBundledLanguages: false,
})

// ============================================
// TIPOS
// ============================================

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]
export type TranslationKey = keyof typeof ptBR

// ============================================
// API PÚBLICA
// ============================================

/**
 * Lista de idiomas disponíveis
 */
export const availableLanguages: Array<{
  code: SupportedLanguage
  name: string
  nativeName: string
  flag: string
}> = [
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'en-US', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
]

/**
 * Muda o idioma da aplicação
 * Salva no storage e atualiza o i18next
 */
export function changeLanguage(language: SupportedLanguage): Promise<void> {
  return new Promise(resolve => {
    try {
      // Salva no storage PRIMEIRO
      safeSetItem(LANGUAGE_KEY, language)
      safeSetItem('i18nextLng', language)

      // Muda no i18next
      i18n
        .changeLanguage(language)
        .then(() => {
          // Atualiza o HTML lang
          try {
            if (globalThis.document) {
              globalThis.document.documentElement.lang = language
            }
          } catch {
            // Ignora
          }

          console.log('[i18n] ✅ Idioma alterado para:', language)
          resolve()
        })
        .catch(() => {
          // Mesmo se falhar, resolve para não quebrar a UI
          resolve()
        })
    } catch {
      resolve()
    }
  })
}

/**
 * Obtém o idioma atual
 */
export function getCurrentLanguage(): SupportedLanguage {
  try {
    const lang = i18n.language
    if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
      return lang as SupportedLanguage
    }
  } catch {
    // Ignora
  }
  return DEFAULT_LANGUAGE
}

/**
 * Verifica se um idioma é suportado
 */
export function isLanguageSupported(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
}

/**
 * Utilitário para obter idiomas disponíveis (legado)
 */
export const getAvailableLanguages = () => availableLanguages

// Export default
export default i18n
