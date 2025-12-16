import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Wallet,
  MessageSquare,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Grid3X3,
  Phone,
  HeadphonesIcon,
  BarChart3,
  Building2,
  GraduationCap,
  Eye,
  Zap,
  ShoppingBag,
  User,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'

const navigation = [
  // Dashboard (sem categoria)
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'dashboard' },

  // Carteira
  { name: 'wallet', href: '/wallet', icon: Wallet, group: 'trading' },
  { name: 'instantTrade', href: '/instant-trade', icon: Zap, group: 'trading' },
  { name: 'marketplace', href: '/p2p', icon: ShoppingBag, group: 'trading' },

  // Comunicação e Serviços
  { name: 'chat', href: '/chat', icon: MessageSquare, group: 'communication' },
  { name: 'services', href: '/services', icon: Grid3X3, group: 'services' },
  { name: 'contact', href: '/contact', icon: Phone, group: 'services' },
  { name: 'support', href: '/support', icon: HeadphonesIcon, group: 'services' },
  { name: 'portfolio', href: '/portfolio', icon: BarChart3, group: 'services' },
  { name: 'institutional', href: '/institutional', icon: Building2, group: 'services' },
  { name: 'education', href: '/education', icon: GraduationCap, group: 'services' },

  // Conta e Configurações
  { name: 'profile', href: '/profile', icon: User, group: 'account' },
  { name: 'settings', href: '/settings', icon: Settings, group: 'account' },
]

const navigationGroups = {
  overview: { label: 'Visão Geral', items: [] as any[] },
  trading: { label: 'Trading & Carteira', items: [] as any[] },
  communication: { label: 'Comunicação', items: [] as any[] },
  services: { label: 'Serviços', items: [] as any[] },
  account: { label: 'Conta & Configurações', items: [] as any[] },
}

export const Sidebar = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const { logout, user } = useAuthStore()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    dashboard: true,
    trading: true,
    communication: false,
    services: false,
    account: false,
  })

  const handleLogout = () => {
    logout()
  }

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }))
  }

  // Organizar itens por grupo
  const organizedNavigation = navigation.reduce(
    (groups, item) => {
      if (!groups[item.group]) {
        groups[item.group] = []
      }
      groups[item.group]?.push(item)
      return groups
    },
    {} as Record<string, any[]>
  )

  const groupLabels: Record<string, string> = {
    dashboard: '',
    trading: 'Carteira',
    communication: 'Comunicação',
    services: 'Serviços',
    account: 'Conta & Configurações',
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className='lg:hidden fixed top-4 left-4 z-50'>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className='p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md'
        >
          {isMobileOpen ? <X className='w-6 h-6' /> : <Menu className='w-6 h-6' />}
        </button>
      </div>

      {/* Overlay */}
      {isMobileOpen && (
        <div
          className='lg:hidden fixed inset-0 bg-gray-600 bg-opacity-75 z-40'
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out flex flex-col ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${isExpanded ? 'lg:w-64' : 'lg:w-20'}`}
      >
        {/* Logo / Toggle */}
        <div className='flex items-center justify-between px-3 lg:px-6 py-6 border-b border-gray-200 dark:border-gray-700'>
          {isExpanded && (
            <div className='flex items-center gap-2'>
              <img
                src='/images/logos/wn-icon.png'
                alt='Wolknow Logo'
                className='h-10 w-10 rounded-lg object-contain'
              />
              <span className='text-lg font-bold text-gray-900 dark:text-white'>WOLK NOW</span>
            </div>
          )}
          {!isExpanded && (
            <img
              src='/images/logos/wn-icon.png'
              alt='Wolknow Logo'
              className='h-10 w-10 rounded-lg object-contain mx-auto'
            />
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className='hidden lg:flex items-center justify-center p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
            title={isExpanded ? 'Recolher' : 'Expandir'}
          >
            <svg
              className='w-4 h-4 text-gray-600 dark:text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d={isExpanded ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
              />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className='flex-1 px-2 lg:px-3 py-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent'>
          {Object.entries(organizedNavigation).map(([groupKey, items]) => (
            <div key={groupKey} className='space-y-1'>
              {/* Category Header - não mostrar para dashboard */}
              {groupKey !== 'dashboard' && isExpanded ? (
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className='w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors'
                >
                  <span>{groupLabels[groupKey] || groupKey}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedGroups[groupKey] ? 'rotate-180' : 'rotate-270'}`}
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 19l-7-7 7-7'
                    />
                  </svg>
                </button>
              ) : null}

              {/* Category Items */}
              {isExpanded && (groupKey === 'dashboard' || expandedGroups[groupKey]) && (
                <div className='space-y-1 pl-1'>
                  {items.map(item => {
                    const isActive = location.pathname.startsWith(item.href)
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <item.icon
                          className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}
                        />
                        <span className='truncate'>{t(`navigation.${item.name}`)}</span>
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Collapsed Navigation Icons */}
              {!isExpanded && (
                <div className='space-y-1'>
                  {items.map(item => {
                    const isActive = location.pathname.startsWith(item.href)
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        title={t(`navigation.${item.name}`)}
                        className={`flex items-center justify-center p-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <item.icon
                          className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}
                        />
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User info and logout */}
        <div className='border-t border-gray-200 dark:border-gray-700 p-2 lg:p-3 space-y-2 lg:space-y-3'>
          {isExpanded ? (
            <>
              <div className='flex items-center gap-3'>
                {/* Avatar with user initials */}
                <div className='h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0'>
                  {(() => {
                    const displayName = user?.firstName || user?.username || 'U'
                    const initials = displayName
                      .split(' ')
                      .map((word: string) => word.charAt(0).toUpperCase())
                      .slice(0, 2)
                      .join('')
                    return initials
                  })()}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                    {user?.firstName || user?.username || 'Usuário'}
                  </p>
                  <div className='flex items-center gap-1'>
                    <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'>
                      {(() => {
                        const numericId = user?.id
                          ? String(user.id).replaceAll(/\D/g, '').substring(0, 5)
                          : '00000'
                        return `UID: WN${numericId}`
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className='w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
              >
                <LogOut className='w-4 h-4' />
                {t('navigation.logout')}
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              title={t('navigation.logout')}
              className='flex items-center justify-center p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors w-full'
            >
              <LogOut className='w-5 h-5' />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
