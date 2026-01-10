import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

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

// ⚠️ ULTRA SIMPLES - SEM localStorage na inicialização
// O idioma será carregado do localStorage DEPOIS pelo App.tsx
i18n.use(initReactI18next).init({
  resources,
  lng: 'pt-BR', // Idioma fixo padrão - mudança via changeLanguage depois
  fallbackLng: 'pt-BR',
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  initImmediate: false,
})

export default i18n

// Tipos para autocompletar traduções
export type TranslationKey = keyof typeof ptBR
export type SupportedLanguage = 'pt-BR' | 'en-US' | 'es-ES' | 'zh-CN' | 'ja-JP' | 'ko-KR'

// Utilitário para mudar idioma - salva no localStorage de forma segura
export const changeLanguage = (language: SupportedLanguage) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('i18nextLng', language)
    }
  } catch {
    // localStorage bloqueado - ignora
  }
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
