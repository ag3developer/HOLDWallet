import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Wallet,
  MessageSquare,
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
  Zap,
  ShoppingBag,
  User,
  Sun,
  Moon,
  ChevronDown,
  ExternalLink,
  Coins,
  MessagesSquare,
  Wrench,
  UserCircle,
  ArrowLeftRight,
  Brain,
  Receipt,
  CircleDollarSign,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'

// Interface para items de navegação
interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  group: string
  badge?: string
  notifications?: number
  external?: boolean
}

const navigation: NavItem[] = [
  // Dashboard
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'dashboard' },

  // Carteira & Trading
  { name: 'wallet', href: '/wallet', icon: Wallet, group: 'trading' },
  { name: 'instantTrade', href: '/instant-trade', icon: Zap, group: 'trading', badge: 'Hot' },
  { name: 'swap', href: '/swap', icon: ArrowLeftRight, group: 'trading', badge: 'Novo' },
  { name: 'wolkpay', href: '/wolkpay', icon: CircleDollarSign, group: 'trading' },
  { name: 'marketplace', href: '/p2p', icon: ShoppingBag, group: 'trading' },

  // Comunicação
  { name: 'chat', href: '/chat', icon: MessageSquare, group: 'communication', notifications: 0 },

  // Serviços
  { name: 'services', href: '/services', icon: Grid3X3, group: 'services' },
  { name: 'billPayment', href: '/bill-payment', icon: Receipt, group: 'services', badge: 'Novo' },
  { name: 'earnpool', href: '/earnpool', icon: TrendingUp, group: 'services', badge: 'Novo' },
  { name: 'referral', href: '/referral', icon: Users, group: 'services', badge: '💰' },
  { name: 'contact', href: '/contact', icon: Phone, group: 'services' },
  { name: 'support', href: '/support', icon: HeadphonesIcon, group: 'services' },
  // { name: 'portfolio', href: '/portfolio', icon: BarChart3, group: 'services' }, // Desabilitado - dados mock
  { name: 'aiIntelligence', href: '/ai-intelligence', icon: Brain, group: 'services', badge: 'AI' },
  // { name: 'institutional', href: '/institutional', icon: Building2, group: 'services' }, // Desabilitado - dados mock
  // { name: 'education', href: '/education', icon: GraduationCap, group: 'services', badge: 'Novo' }, // Desabilitado - dados mock

  // Conta
  { name: 'profile', href: '/profile', icon: User, group: 'account' },
  { name: 'settings', href: '/settings', icon: Settings, group: 'account' },
]

const groupLabels: Record<string, string> = {
  dashboard: '',
  trading: 'Carteira & Trading',
  communication: 'Comunicação',
  services: 'Serviços',
  account: 'Conta',
}

const groupIcons: Record<string, React.ElementType> = {
  trading: Coins,
  communication: MessagesSquare,
  services: Wrench,
  account: UserCircle,
}

// Componente de Tooltip
const Tooltip = ({
  children,
  text,
  show,
}: {
  children: React.ReactNode
  text: string
  show: boolean
}) => (
  <div className='relative group/tooltip'>
    {children}
    {show && (
      <div className='absolute left-full ml-3 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 whitespace-nowrap z-[60] shadow-xl pointer-events-none'>
        {text}
        <div className='absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700' />
      </div>
    )}
  </div>
)

export const Sidebar = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const { logout, user } = useAuthStore()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'))
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    dashboard: true,
    trading: true,
    communication: true,
    services: false,
    account: true,
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

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Organizar itens por grupo
  const organizedNavigation = navigation.reduce(
    (groups, item) => {
      groups[item.group] ??= []
      groups[item.group]?.push(item)
      return groups
    },
    {} as Record<string, NavItem[]>
  )

  return (
    <>
      {/* Mobile menu button - Floating */}
      <div className='lg:hidden fixed top-4 left-4 z-50'>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className='p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 active:scale-95 transition-transform'
        >
          {isMobileOpen ? (
            <X className='w-5 h-5 text-gray-700 dark:text-gray-300' />
          ) : (
            <Menu className='w-5 h-5 text-gray-700 dark:text-gray-300' />
          )}
        </button>
      </div>

      {/* Overlay com blur */}
      {isMobileOpen && (
        <button
          type='button'
          className='lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40'
          onClick={() => setIsMobileOpen(false)}
          onKeyDown={e => e.key === 'Escape' && setIsMobileOpen(false)}
          aria-label='Fechar menu'
        />
      )}

      {/* Sidebar Principal */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col shadow-xl lg:shadow-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${isExpanded ? 'w-72' : 'w-20'}`}
      >
        {/* Header com Logo */}
        <div className='flex items-center justify-between px-4 py-5 border-b border-gray-100 dark:border-gray-800'>
          {isExpanded ? (
            <Link to='/dashboard' className='flex items-center gap-3 group'>
              <div className='relative'>
                <img
                  src='/images/logos/wn-icon.png'
                  alt='Wolk Now'
                  className='h-10 w-10 rounded-xl object-contain shadow-md group-hover:shadow-lg transition-shadow'
                />
                <span className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full' />
              </div>
              <div>
                <span className='text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                  WOLK NOW
                </span>
                <p className='text-[10px] text-gray-500 dark:text-gray-400 font-medium'>
                  {t('landing.slogan')}
                </p>
              </div>
            </Link>
          ) : (
            <Link to='/dashboard' className='mx-auto relative'>
              <img
                src='/images/logos/wn-icon.png'
                alt='Wolk Now'
                className='h-10 w-10 rounded-xl object-contain shadow-md hover:shadow-lg transition-shadow'
              />
              <span className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full' />
            </Link>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className='hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
            title={isExpanded ? 'Recolher menu' : 'Expandir menu'}
          >
            <svg
              className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-300 ${!isExpanded ? 'rotate-180' : ''}`}
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
        </div>

        {/* Quick Actions - Only when expanded */}
        {isExpanded && (
          <div className='px-4 py-3 border-b border-gray-100 dark:border-gray-800'>
            <div className='flex gap-2'>
              <Link
                to='/instant-trade'
                className='flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg active:scale-95'
              >
                <Zap className='w-4 h-4' />
                Trade
              </Link>
              <Link
                to='/wallet'
                className='flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors active:scale-95'
              >
                <Wallet className='w-4 h-4' />
                Wallet
              </Link>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className='flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent'>
          {Object.entries(organizedNavigation).map(([groupKey, items]) => (
            <div key={groupKey} className='mb-2'>
              {/* Group Header */}
              {groupKey !== 'dashboard' && isExpanded && (
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className='w-full flex items-center justify-between px-3 py-2 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50'
                >
                  <div className='flex items-center gap-2'>
                    {groupIcons[groupKey] &&
                      (() => {
                        const GroupIcon = groupIcons[groupKey]
                        return <GroupIcon className='w-4 h-4' />
                      })()}
                    <span>{groupLabels[groupKey] || groupKey}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${expandedGroups[groupKey] ? '' : '-rotate-90'}`}
                  />
                </button>
              )}

              {/* Divider for collapsed mode */}
              {groupKey !== 'dashboard' && !isExpanded && (
                <div className='mx-2 my-3 border-t border-gray-200 dark:border-gray-700' />
              )}

              {/* Navigation Items */}
              {(groupKey === 'dashboard' || expandedGroups[groupKey] || !isExpanded) && (
                <div className='space-y-1'>
                  {items.map(item => {
                    const isActive =
                      location.pathname === item.href ||
                      location.pathname.startsWith(item.href + '/')
                    const ItemIcon = item.icon

                    return (
                      <Tooltip
                        key={item.name}
                        text={t(`navigation.${item.name}`)}
                        show={!isExpanded}
                      >
                        <Link
                          to={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-700 dark:text-blue-400 shadow-sm'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          } ${!isExpanded ? 'justify-center' : ''}`}
                        >
                          {/* Active indicator */}
                          {isActive && (
                            <span className='absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full' />
                          )}

                          {/* Icon */}
                          <div
                            className={`relative flex-shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}
                          >
                            <ItemIcon
                              className={`w-5 h-5 ${
                                isActive
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                              }`}
                            />
                            {/* Notification badge */}
                            {item.notifications !== undefined && item.notifications > 0 && (
                              <span className='absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse'>
                                {item.notifications > 9 ? '9+' : item.notifications}
                              </span>
                            )}
                          </div>

                          {/* Label and badge */}
                          {isExpanded && (
                            <>
                              <span className='flex-1 truncate'>
                                {t(`navigation.${item.name}`)}
                              </span>
                              {item.badge && (
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                    item.badge === 'Hot'
                                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse'
                                      : item.badge === 'Novo'
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                              {item.external && <ExternalLink className='w-3 h-3 text-gray-400' />}
                            </>
                          )}
                        </Link>
                      </Tooltip>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer Section */}
        <div className='border-t border-gray-100 dark:border-gray-800 p-3 space-y-3'>
          {/* Theme Toggle */}
          <div className={`flex ${isExpanded ? 'justify-between' : 'justify-center'} items-center`}>
            {isExpanded && (
              <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>Tema</span>
            )}
            <button
              onClick={toggleDarkMode}
              className='flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
              title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
            >
              {isDarkMode ? (
                <Sun className='w-4 h-4 text-yellow-500' />
              ) : (
                <Moon className='w-4 h-4 text-gray-600' />
              )}
              {isExpanded && (
                <span className='text-xs font-medium text-gray-600 dark:text-gray-300'>
                  {isDarkMode ? 'Claro' : 'Escuro'}
                </span>
              )}
            </button>
          </div>

          {/* User Profile */}
          {isExpanded ? (
            <div className='bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-xl p-3'>
              <div className='flex items-center gap-3'>
                <div className='relative'>
                  <div className='h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md'>
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
                  <span className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-semibold text-gray-900 dark:text-white truncate'>
                    {user?.firstName || user?.username || 'Usuário'}
                  </p>
                  <div className='flex items-center gap-1.5'>
                    <span className='inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'>
                      {(() => {
                        const numericId = user?.id
                          ? String(user.id).replaceAll(/\D/g, '').substring(0, 5)
                          : '00000'
                        return `WN${numericId}`
                      })()}
                    </span>
                    <span className='text-[10px] text-green-600 dark:text-green-400 font-medium'>
                      ● Online
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className='w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors'
              >
                <LogOut className='w-4 h-4' />
                {t('navigation.logout')}
              </button>
            </div>
          ) : (
            <Tooltip text={t('navigation.logout')} show>
              <button
                onClick={handleLogout}
                title={t('navigation.logout')}
                aria-label='Sair'
                className='flex items-center justify-center p-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors w-full'
              >
                <LogOut className='w-5 h-5' />
              </button>
            </Tooltip>
          )}

          {/* Version */}
          {isExpanded && (
            <p className='text-center text-[10px] text-gray-400 dark:text-gray-500'>
              v2.0.0 • Wolk Now © 2017-2026
            </p>
          )}
        </div>
      </div>
    </>
  )
}
