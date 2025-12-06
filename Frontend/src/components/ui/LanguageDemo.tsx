import { useTranslation } from 'react-i18next'
import { getAvailableLanguages } from '@/config/i18n'

export const LanguageDemo = () => {
  const { t, i18n } = useTranslation()

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {t('settings.language', 'Idioma')}
      </h3>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('common.welcome', 'Bem-vindo')} - {i18n.language}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {getAvailableLanguages().map((lang) => (
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

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p><strong>{t('navigation.dashboard')}:</strong> {t('navigation.dashboard')}</p>
        <p><strong>{t('navigation.wallet')}:</strong> {t('navigation.wallet')}</p>
        <p><strong>{t('navigation.p2p')}:</strong> {t('navigation.p2p')}</p>
        <p><strong>{t('auth.login')}:</strong> {t('auth.login')}</p>
        <p><strong>{t('common.success')}:</strong> {t('common.success')}</p>
      </div>
    </div>
  )
}
