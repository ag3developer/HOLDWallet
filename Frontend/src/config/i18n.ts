import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Importar traduções
import ptBR from '@/locales/pt-BR.json'
import enUS from '@/locales/en-US.json'
import esES from '@/locales/es-ES.json'
import zhCN from '@/locales/zh-CN.json'
import jaJP from '@/locales/ja-JP.json'
import koKR from '@/locales/ko-KR.json'

// Recursos de tradução
const resources = {
  'pt-BR': { translation: ptBR },
  'en-US': { translation: enUS },
  'es-ES': { translation: esES },
  'zh-CN': { translation: zhCN },
  'ja-JP': { translation: jaJP },
  'ko-KR': { translation: koKR },
} as const

// Detecta se localStorage está disponível (Safari iOS PWA pode ter problemas)
const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__i18n_test__'
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
    if (isLocalStorageAvailable()) {
      return localStorage.getItem('i18nextLng')
    }
  } catch {
    // Silencia erro
  }
  return null
}

// Configura detecção baseado na disponibilidade do localStorage
const detectionOptions = isLocalStorageAvailable()
  ? {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    }
  : {
      order: ['navigator', 'htmlTag'],
      caches: [],
    }

// Idioma inicial
const initialLanguage = getSavedLanguage() || 'pt-BR'

// Configuração do i18next
// eslint-disable-next-line @typescript-eslint/no-floating-promises
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-BR',
    lng: initialLanguage,
    debug: false, // Desabilitar debug em produção

    detection: detectionOptions,

    interpolation: {
      escapeValue: false, // React já faz escape automático
      formatSeparator: ',',
    },

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
    },

    // Configurações de namespace
    defaultNS: 'translation',
    ns: ['translation'],

    // Configurações de carregamento - usar 'currentOnly' para códigos com região (pt-BR, en-US)
    load: 'currentOnly',
    preload: ['pt-BR'],
    partialBundledLanguages: true,

    // Configurações de cache
    updateMissing: false,
    saveMissing: false,

    // Configurações de formato
    returnEmptyString: false,
    returnNull: false,
    returnObjects: false,

    // Configurações de pluralização
    pluralSeparator: '_',
    contextSeparator: '_',

    // Garantir que as keys sejam exibidas se não houver tradução
    missingKeyHandler: false,

    // Configurações de parsing
    parseMissingKeyHandler: (key: string) => {
      if (import.meta.env.DEV) {
        console.warn(`Missing translation key: ${key}`)
      }
      return key
    },

    // Forçar inicialização síncrona
    initImmediate: false,
  })

export default i18n

// Tipos para autocompletar traduções
export type TranslationKey = keyof typeof ptBR
export type SupportedLanguage = 'pt-BR' | 'en-US' | 'es-ES' | 'zh-CN' | 'ja-JP' | 'ko-KR'

// Utilitário para mudar idioma
export const changeLanguage = (language: SupportedLanguage) => {
  return i18n.changeLanguage(language)
}

// Utilitário para obter idiomas disponíveis
export const getAvailableLanguages = (): Array<{
  code: SupportedLanguage
  name: string
  nativeName: string
}> => [
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
]
