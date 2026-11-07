import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftRight, Home, LayoutGrid, Users, Wallet } from 'lucide-react'

/** Navegação fixa no rodapé para celular e tablet (abaixo de lg a barra lateral vira gaveta). */
export const MobileTabBar = () => {
  const { t } = useTranslation()
  const item = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-1 min-h-[44px] text-[11px] transition-colors ${
      isActive ? 'font-semibold text-gray-900 dark:text-[#EEF1F7]' : 'text-gray-500 dark:text-[#8590A6]'
    }`

  return (
    <nav
      aria-label={t('home.nav.label')}
      className='lg:hidden fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-center px-2 pt-2 bg-white/95 border-t border-gray-200 backdrop-blur dark:bg-[#0D121C]/95 dark:border-[#1A2232]'
      style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
    >
      <NavLink to='/dashboard' className={item}>
        <Home className='w-[22px] h-[22px]' aria-hidden='true' />
        {t('home.nav.home')}
      </NavLink>
      <NavLink to='/wallet' className={item}>
        <Wallet className='w-[22px] h-[22px]' aria-hidden='true' />
        {t('home.nav.wallet')}
      </NavLink>
      <NavLink to='/instant-trade' aria-label={t('home.nav.trade')} className='flex justify-center'>
        <span className='w-[52px] h-[52px] rounded-2xl bg-blue-600 text-white dark:bg-[#5B8CFF] dark:text-[#0A0E15] flex items-center justify-center shadow-sm'>
          <ArrowLeftRight className='w-6 h-6' aria-hidden='true' />
        </span>
      </NavLink>
      <NavLink to='/p2p' className={item}>
        <Users className='w-[22px] h-[22px]' aria-hidden='true' />
        P2P
      </NavLink>
      <NavLink to='/services' className={item}>
        <LayoutGrid className='w-[22px] h-[22px]' aria-hidden='true' />
        {t('home.nav.services')}
      </NavLink>
    </nav>
  )
}
