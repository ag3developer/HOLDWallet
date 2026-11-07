import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronDown, Menu, Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/stores/useThemeStore'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { BackendStatusIndicator } from '@/components/ui/BackendStatusIndicator'
import { NotificationCenter } from '@/components/NotificationCenter'

const LANGS = [
  { id: 'pt-BR', label: 'PT' },
  { id: 'en-US', label: 'EN' },
  { id: 'es-ES', label: 'ES' },
  { id: 'zh-CN', label: '中文' },
  { id: 'ja-JP', label: '日本語' },
  { id: 'ko-KR', label: '한국어' },
]

const iconBtn =
  'w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-[#8590A6] dark:hover:text-white dark:hover:bg-[#172033] transition-colors'

/** Cabeçalho: menu (celular), status, idioma, notificações e o único botão de tema do app. */
export const Header = () => {
  const { i18n } = useTranslation()
  const { isDark, toggleTheme } = useThemeStore()
  const setMobileOpen = useSidebarStore(s => s.setMobileOpen)

  return (
    <header className='h-16 shrink-0 flex items-center gap-2 px-3 sm:px-6 bg-white/90 backdrop-blur border-b border-gray-200 dark:bg-[#0D121C]/90 dark:border-[#1A2232]'>
      {/* Celular/tablet: abre o menu e mostra a marca */}
      <button type='button' onClick={() => setMobileOpen(true)} aria-label='Abrir menu' className={`lg:hidden ${iconBtn}`}>
        <Menu className='w-5 h-5' aria-hidden='true' />
      </button>
      <Link to='/dashboard' className='lg:hidden flex items-center gap-2' aria-label='Wolknow — início'>
        <img src='/images/logos/wn-icon.png' alt='' className='w-8 h-8 rounded-lg object-contain' />
        <span className='font-semibold text-gray-900 dark:text-[#EEF1F7] hidden sm:inline'>Wolknow</span>
      </Link>

      <div className='ml-auto flex items-center gap-1 sm:gap-2'>
        <BackendStatusIndicator />

        <label className='relative'>
          <span className='sr-only'>Idioma</span>
          <select
            value={i18n.language}
            onChange={e => i18n.changeLanguage(e.target.value)}
            className='appearance-none h-10 pl-3 pr-8 rounded-xl bg-transparent border border-gray-200 dark:border-[#222B3D] text-sm font-medium text-gray-700 dark:text-[#A3ADC2] hover:border-gray-300 dark:hover:border-[#2F3D5C] focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer'
          >
            {LANGS.map(l => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <ChevronDown className='absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none' aria-hidden='true' />
        </label>

        <NotificationCenter />

        <button type='button' onClick={toggleTheme} aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'} title={isDark ? 'Tema claro' : 'Tema escuro'} className={iconBtn}>
          {isDark ? <Sun className='w-5 h-5' aria-hidden='true' /> : <Moon className='w-5 h-5' aria-hidden='true' />}
        </button>
      </div>
    </header>
  )
}
