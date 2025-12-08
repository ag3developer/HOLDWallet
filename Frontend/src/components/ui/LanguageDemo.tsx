import { useTranslation } from 'react-i18next'
import { useLanguageStore } from '@/stores/useLanguageStore'
import { getAvailableLanguages } from '@/config/i18n'
import toast from 'react-hot-toast'

export const LanguageDemo = () => {
  const { t, i18n } = useTranslation()
  const { setLanguage } = useLanguageStore()

  const handleLanguageChange = (langCode: string) => {
    // Extrair código curto do código completo (pt-BR → pt, en-US → en, etc)
    const shortCodeMap: { [key: string]: 'pt' | 'en' | 'es' } = {
      'pt-BR': 'pt',
      'en-US': 'en',
      'es-ES': 'es',
      'zh-CN': 'en', // Fallback para English
      'ja-JP': 'en', // Fallback para English
      'ko-KR': 'en', // Fallback para English
    }

    const shortCode = shortCodeMap[langCode as keyof typeof shortCodeMap] || ('en' as const)

    // Alterar idioma no i18n (usando código completo) - ASYNC
    i18n.changeLanguage(langCode).then(() => {
      // Salvar em ambas as chaves de localStorage APÓS mudança
      localStorage.setItem('i18nextLng', langCode)

      // Salvar no Zustand store (usando código curto)
      setLanguage(shortCode)

      toast.success(t('common.languageChanged', 'Idioma alterado com sucesso!'))
    })
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4'>
      <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
        {t('settings.language', 'Idioma')}
      </h3>

      <p className='text-sm text-gray-600 dark:text-gray-400'>
        {t('common.welcome', 'Bem-vindo')} - {i18n.language}
      </p>

      <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
        {getAvailableLanguages().map(lang => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`p-2 text-sm rounded-lg border transition-colors ${
              i18n.language === lang.code
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {lang.nativeName}
          </button>
        ))}
      </div>

      <div className='text-xs text-gray-500 dark:text-gray-400 space-y-1'>
        <p>
          <strong>{t('navigation.dashboard')}:</strong> {t('navigation.dashboard')}
        </p>
        <p>
          <strong>{t('navigation.wallet')}:</strong> {t('navigation.wallet')}
        </p>
        <p>
          <strong>{t('navigation.marketplace')}:</strong> {t('navigation.marketplace')}
        </p>
        <p>
          <strong>{t('auth.login')}:</strong> {t('auth.login')}
        </p>
        <p>
          <strong>{t('common.success')}:</strong> {t('common.success')}
        </p>
      </div>
    </div>
  )
}
