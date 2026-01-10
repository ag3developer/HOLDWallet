/**
 * 🌍 i18n Configuration - Safari iOS PWA Compatible
 * ==================================================
 *
 * Configuração otimizada para funcionar em:
 * - Safari iOS PWA (standalone mode)
 * - Safari iOS browser
 * - Chrome/Firefox desktop e mobile
 * - Android WebView
 *
 * IMPORTANTE: Esta configuração NÃO usa localStorage diretamente
 * no LanguageDetector para evitar crashes no Safari iOS PWA.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Importar traduções diretamente (bundled)
import ptBR from '@/locales/pt-BR.json'
import enUS from '@/locales/en-US.json'
import esES from '@/locales/es-ES.json'
import zhCN from '@/locales/zh-CN.json'
import jaJP from '@/locales/ja-JP.json'
import koKR from '@/locales/ko-KR.json'

// ============================================
// STORAGE HELPERS (Safari iOS Safe)
// ============================================

const LANGUAGE_KEY = 'wolknow_language'

// Verifica se localStorage está disponível de forma segura
const isStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false
    }
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

// Obtém idioma salvo de forma segura
const getSavedLanguage = (): string | null => {
  try {
    if (!isStorageAvailable()) return null
    return localStorage.getItem(LANGUAGE_KEY)
  } catch {
    return null
  }
}

// Salva idioma de forma segura
const saveLanguage = (lang: string): void => {
  try {
    if (!isStorageAvailable()) return
    localStorage.setItem(LANGUAGE_KEY, lang)
    // Também salva no i18nextLng para compatibilidade
    localStorage.setItem('i18nextLng', lang)
  } catch {
    // Silently fail
  }
}

// Detecta idioma do navegador de forma segura
const detectBrowserLanguage = (): string => {
  try {
    if (typeof navigator === 'undefined') return 'pt-BR'

    const browserLang =
      navigator.language || (navigator as { userLanguage?: string }).userLanguage || ''
    const langLower = browserLang.toLowerCase()

    // Mapeamento de idiomas
    if (langLower.startsWith('pt')) return 'pt-BR'
    if (langLower.startsWith('en')) return 'en-US'
    if (langLower.startsWith('es')) return 'es-ES'
    if (langLower.startsWith('zh')) return 'zh-CN'
    if (langLower.startsWith('ja')) return 'ja-JP'
    if (langLower.startsWith('ko')) return 'ko-KR'

    return 'pt-BR' // fallback
  } catch {
    return 'pt-BR'
  }
}

// Determina o idioma inicial
const getInitialLanguage = (): string => {
  // 1. Tenta pegar do localStorage
  const saved = getSavedLanguage()
  if (saved && ['pt-BR', 'en-US', 'es-ES', 'zh-CN', 'ja-JP', 'ko-KR'].includes(saved)) {
    return saved
  }

  // 2. Detecta do navegador
  return detectBrowserLanguage()
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
} as const

// ============================================
// INICIALIZAÇÃO DO i18next
// ============================================

const initialLanguage = getInitialLanguage()

// Inicializa SEM o LanguageDetector plugin (evita problemas no Safari iOS)
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'pt-BR',

    // Debug apenas em desenvolvimento
    debug: false,

    // Interpolação
    interpolation: {
      escapeValue: false,
      formatSeparator: ',',
    },

    // Configurações do React
    react: {
      useSuspense: false, // IMPORTANTE: Desabilita Suspense para evitar problemas
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p', 'span'],
    },

    // Namespace
    defaultNS: 'translation',
    ns: ['translation'],

    // Carregamento
    load: 'currentOnly',

    // Desabilita funcionalidades que podem causar problemas
    saveMissing: false,
    updateMissing: false,

    // Retorno
    returnEmptyString: false,
    returnNull: false,
    returnObjects: false,

    // Inicialização síncrona (IMPORTANTE para Safari iOS)
    initImmediate: true,

    // Handler para keys não encontradas
    parseMissingKeyHandler: (key: string) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing key: ${key}`)
      }
      return key
    },
  })
  .then(() => {
    console.log(`[i18n] ✅ Inicializado com idioma: ${initialLanguage}`)
  })
  .catch(error => {
    console.error('[i18n] ❌ Erro na inicialização:', error)
  })

// ============================================
// TIPOS E EXPORTS
// ============================================

export type TranslationKey = keyof typeof ptBR
export type SupportedLanguage = 'pt-BR' | 'en-US' | 'es-ES' | 'zh-CN' | 'ja-JP' | 'ko-KR'

// Lista de idiomas disponíveis
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
 * Esta função é segura para usar no Safari iOS PWA
 */
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  try {
    // Salva no storage ANTES de mudar (para garantir persistência)
    saveLanguage(language)

    // Muda o idioma no i18next
    await i18n.changeLanguage(language)

    // Atualiza o atributo lang do HTML
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
    }

    console.log(`[i18n] ✅ Idioma alterado para: ${language}`)
  } catch (error) {
    console.error('[i18n] ❌ Erro ao mudar idioma:', error)
    // Não lança erro para não quebrar a UI
  }
}

/**
 * Obtém o idioma atual
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language || 'pt-BR') as SupportedLanguage
}

/**
 * Utilitário para obter idiomas disponíveis (legado)
 */
export const getAvailableLanguages = () => availableLanguages

export default i18n
