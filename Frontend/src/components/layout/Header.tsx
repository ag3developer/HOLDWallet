import { useTranslation } from 'react-i18next'
import { Bell, Sun, Moon, Globe, Search } from 'lucide-react'
import { useThemeStore } from '@/stores/useThemeStore'
import { BackendStatusIndicator } from '@/components/ui/BackendStatusIndicator'
import { useState } from 'react'

export const Header = () => {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useThemeStore()
  const [searchQuery, setSearchQuery] = useState('')

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
  }

  return (
    <header className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4'>
      <div className='flex items-center justify-between gap-6'>
        {/* Search Bar */}
        <div className='hidden md:flex flex-1 max-w-md'>
          <div className='relative w-full'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar carteiras, transações...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all'
            />
          </div>
        </div>

        {/* Header actions */}
        <div className='flex items-center gap-4 ml-auto'>
          {/* Backend Status Indicator */}
          <BackendStatusIndicator />

          {/* Language selector */}
          <div className='relative'>
            <select
              value={i18n.language}
              onChange={e => handleLanguageChange(e.target.value)}
              className='appearance-none bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 pr-8 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500'
              title='Selecionar idioma'
            >
              <option value='pt-BR'>PT</option>
              <option value='en-US'>EN</option>
              <option value='es-ES'>ES</option>
              <option value='zh-CN'>中文</option>
              <option value='ja-JP'>日本語</option>
              <option value='ko-KR'>한국어</option>
            </select>
            <Globe className='absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none' />
          </div>

          {/* Notifications */}
          <button
            className='relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700'
            title='Notificações'
          >
            <Bell className='w-5 h-5' />
            <span className='absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full'></span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700'
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? <Sun className='w-5 h-5' /> : <Moon className='w-5 h-5' />}
          </button>
        </div>
      </div>
    </header>
  )
}
