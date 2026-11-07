import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftRight,
  Brain,
  CircleDollarSign,
  HeadphonesIcon,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSidebarStore } from '@/stores/useSidebarStore'

interface NavItem {
  key: string
  href: string
  icon: React.ElementType
}
interface NavGroup {
  label?: string
  items: NavItem[]
}

const GROUPS: NavGroup[] = [
  {
    items: [
      { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
      { key: 'wallet', href: '/wallet', icon: Wallet },
    ],
  },
  {
    label: 'trade',
    items: [
      { key: 'instantTrade', href: '/instant-trade', icon: Zap },
      { key: 'swap', href: '/swap', icon: ArrowLeftRight },
      { key: 'marketplace', href: '/p2p', icon: ShoppingBag },
      { key: 'wolkpay', href: '/wolkpay', icon: CircleDollarSign },
    ],
  },
  {
    label: 'services',
    items: [
      { key: 'billPayment', href: '/bill-payment', icon: Receipt },
      { key: 'earnpool', href: '/earnpool', icon: TrendingUp },
      { key: 'referral', href: '/referral', icon: Users },
      { key: 'aiIntelligence', href: '/ai-intelligence', icon: Brain },
      { key: 'chat', href: '/chat', icon: MessageSquare },
    ],
  },
  {
    label: 'account',
    items: [
      { key: 'support', href: '/support', icon: HeadphonesIcon },
      { key: 'settings', href: '/settings', icon: Settings },
    ],
  },
]
const GROUP_LABEL: Record<string, string> = { trade: 'Negociar', services: 'Serviços', account: 'Conta' }

const initials = (name: string) =>
  name
    .split(' ')
    .map(w => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || 'U'

/**
 * Barra lateral com geometria fixa: aberta 264 px, recolhida 72 px.
 * Os ícones ficam sempre na mesma posição; ao recolher, só os textos somem.
 */
export const Sidebar = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const { logout, user } = useAuthStore()
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebarStore()
  const [tip, setTip] = useState<{ text: string; top: number } | null>(null)

  // Fecha a gaveta ao navegar e com Esc
  useEffect(() => setMobileOpen(false), [location.pathname, setMobileOpen])
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen, setMobileOpen])

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(`${href}/`)
  const name = user?.firstName || user?.username || 'Usuário'
  const userCode = `WN${user?.id ? String(user.id).replaceAll(/\D/g, '').substring(0, 5) : '00000'}`

  /** No celular a gaveta sempre aparece aberta; no desktop segue a preferência. */
  const panel = (compact: boolean, mobile: boolean) => {
    const showTip = (e: React.MouseEvent<HTMLElement>, text: string) => {
      if (!compact) return
      const r = e.currentTarget.getBoundingClientRect()
      setTip({ text, top: r.top + r.height / 2 })
    }
    const label = `whitespace-nowrap transition-opacity duration-200 ${compact ? 'opacity-0' : 'opacity-100'}`

    return (
      <div className='h-full flex flex-col bg-white dark:bg-[#0D121C] border-r border-gray-200 dark:border-[#1A2232] text-gray-900 dark:text-[#EEF1F7]'>
        {/* Topo: marca + recolher */}
        <div className='h-16 shrink-0 flex items-center px-3 border-b border-gray-100 dark:border-[#1A2232]'>
          <Link
            to='/dashboard'
            aria-label='Wolknow — início'
            className='flex items-center gap-3 h-10 pl-[4px] rounded-xl overflow-hidden flex-1 min-w-0'
          >
            <img src='/images/logos/wn-icon.png' alt='' className='w-10 h-10 shrink-0 rounded-xl object-contain' />
            <span className={`${label} min-w-0`}>
              <span className='block font-semibold leading-tight'>Wolknow</span>
              <span className='block text-xs text-gray-500 dark:text-[#8590A6] leading-tight'>{t('landing.slogan')}</span>
            </span>
          </Link>
          {mobile ? (
            <button
              type='button'
              onClick={() => setMobileOpen(false)}
              aria-label='Fechar menu'
              className='w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:text-[#8590A6] dark:hover:bg-[#172033]'
            >
              <X className='w-5 h-5' aria-hidden='true' />
            </button>
          ) : (
            !compact && (
              <button
                type='button'
                onClick={toggleCollapsed}
                aria-label='Recolher menu'
                className='w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-[#8590A6] dark:hover:text-white dark:hover:bg-[#172033]'
              >
                <PanelLeftClose className='w-[18px] h-[18px]' aria-hidden='true' />
              </button>
            )
          )}
        </div>

        {/* Navegação */}
        <nav
          aria-label='Menu principal'
          className='flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          onScroll={() => setTip(null)}
        >
          {compact && !mobile && (
            <button
              type='button'
              onClick={toggleCollapsed}
              aria-label='Expandir menu'
              onMouseEnter={e => showTip(e, 'Expandir menu')}
              onMouseLeave={() => setTip(null)}
              className='w-full h-10 mb-1 pl-[14px] flex items-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-[#8590A6] dark:hover:text-white dark:hover:bg-[#172033]'
            >
              <PanelLeftOpen className='w-5 h-5 shrink-0' aria-hidden='true' />
            </button>
          )}
          {GROUPS.map((g, gi) => (
            <div key={g.label || gi}>
              {g.label && (
                <div className='h-7 mt-2 flex items-center' aria-hidden={compact}>
                  {compact ? (
                    <span className='mx-auto w-6 h-px bg-gray-200 dark:bg-[#222B3D]' />
                  ) : (
                    <span className='pl-[14px] text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#5F6B82] whitespace-nowrap'>
                      {GROUP_LABEL[g.label]}
                    </span>
                  )}
                </div>
              )}
              <ul className='space-y-0.5'>
                {g.items.map(item => {
                  const active = isActive(item.href)
                  const text = t(`navigation.${item.key}`)
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        aria-current={active ? 'page' : undefined}
                        aria-label={compact ? text : undefined}
                        onMouseEnter={e => showTip(e, text)}
                        onMouseLeave={() => setTip(null)}
                        onFocus={e => showTip(e as unknown as React.MouseEvent<HTMLElement>, text)}
                        onBlur={() => setTip(null)}
                        className={`relative flex items-center gap-3 h-10 pl-[14px] pr-3 rounded-xl overflow-hidden text-sm transition-colors ${
                          active
                            ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-[#172033] dark:text-white'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-[#A3ADC2] dark:hover:bg-[#121A29] dark:hover:text-white'
                        }`}
                      >
                        {active && <span className='absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-blue-600 dark:bg-[#5B8CFF]' aria-hidden='true' />}
                        <item.icon className='w-5 h-5 shrink-0' aria-hidden='true' />
                        <span className={label}>{text}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Rodapé: usuário */}
        <div className='shrink-0 border-t border-gray-100 dark:border-[#1A2232] px-3 py-3'>
          <div className='flex items-center gap-2'>
            <Link
              to='/profile'
              aria-label={compact ? `Perfil de ${name}` : undefined}
              onMouseEnter={e => showTip(e, name)}
              onMouseLeave={() => setTip(null)}
              className='flex items-center gap-3 h-12 pl-[4px] pr-2 rounded-xl overflow-hidden flex-1 min-w-0 hover:bg-gray-100 dark:hover:bg-[#121A29]'
            >
              <span className='relative w-10 h-10 shrink-0 rounded-full bg-gray-100 dark:bg-[#172033] flex items-center justify-center text-sm font-semibold'>
                {initials(name)}
                <span className='absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0D121C]' aria-hidden='true' />
              </span>
              <span className={`${label} min-w-0`}>
                <span className='block text-sm font-semibold truncate'>{name}</span>
                <span className='block text-xs text-gray-500 dark:text-[#8590A6]'>{userCode}</span>
              </span>
            </Link>
            {!compact && (
              <button
                type='button'
                onClick={logout}
                aria-label={t('navigation.logout')}
                title={t('navigation.logout')}
                className='w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:text-[#8590A6] dark:hover:text-[#FF7A7A] dark:hover:bg-[#FF7A7A]/10'
              >
                <LogOut className='w-5 h-5' aria-hidden='true' />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop */}
      <aside
        className={`hidden lg:block h-screen shrink-0 transition-[width] duration-200 ease-out ${collapsed ? 'w-[72px]' : 'w-[264px]'}`}
        aria-label='Barra lateral'
      >
        {panel(collapsed, false)}
      </aside>

      {/* Tooltip do modo recolhido (fora da área com rolagem, não é cortado) */}
      {tip && collapsed && (
        <div
          role='tooltip'
          className='hidden lg:block fixed z-[70] left-[80px] -translate-y-1/2 px-3 py-1.5 rounded-lg bg-gray-900 text-white dark:bg-[#1A2336] dark:border dark:border-[#2A3449] text-sm whitespace-nowrap shadow-lg pointer-events-none'
          style={{ top: tip.top }}
        >
          {tip.text}
        </div>
      )}

      {/* Celular/tablet: gaveta */}
      {mobileOpen && (
        <div className='lg:hidden fixed inset-0 z-50'>
          <button type='button' aria-label='Fechar menu' onClick={() => setMobileOpen(false)} className='absolute inset-0 bg-black/50' />
          <aside className='absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl' aria-label='Menu'>
            {panel(false, true)}
          </aside>
        </div>
      )}
    </>
  )
}
