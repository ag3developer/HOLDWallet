import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Zap,
  MessageSquare,
  User,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Grid3X3,
  Minus,
  Phone,
  HeadphonesIcon,
  BarChart3,
  Building2,
  GraduationCap,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'

const navigation = [
  // Visão geral
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'overview' },

  // Carteira e Trading
  { name: 'wallet', href: '/wallet', icon: Wallet, group: 'trading' },
  { name: 'instantTrade', href: '/instant-trade', icon: Zap, group: 'trading' },
  { name: 'marketplace', href: '/p2p', icon: ArrowLeftRight, group: 'trading' },

  // Comunicação e Serviços
  { name: 'chat', href: '/chat', icon: MessageSquare, group: 'communication' },
  { name: 'services', href: '/services', icon: Grid3X3, group: 'services' },
  { name: 'contact', href: '/contact', icon: Phone, group: 'services' },
  { name: 'support', href: '/support', icon: HeadphonesIcon, group: 'services' },
  { name: 'portfolio', href: '/portfolio', icon: BarChart3, group: 'services' },
  { name: 'institutional', href: '/institutional', icon: Building2, group: 'services' },
  { name: 'education', href: '/education', icon: GraduationCap, group: 'services' },

  // Conta e Configurações
  { name: 'kyc', href: '/kyc', icon: Shield, group: 'account' },
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

  const handleLogout = () => {
    logout()
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
        className={`${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out flex flex-col`}
      >
        {/* Logo */}
        <div className='flex items-center gap-4 px-6 py-6 border-b border-gray-200 dark:border-gray-700'>
          <img
            src='/images/logos/hw-icon.png'
            alt='HOLD Wallet Logo'
            className='h-12 w-12 rounded-lg object-contain'
          />
          <span className='text-xl font-bold text-gray-900 dark:text-white'>HOLD Wallet</span>
        </div>

        {/* Navigation */}
        <nav className='flex-1 px-4 py-6 space-y-1'>
          {Object.entries(organizedNavigation).map(([groupKey, items], groupIndex) => (
            <div key={groupKey}>
              {groupIndex > 0 && (
                <div className='flex items-center my-4'>
                  <div className='flex-1 border-t border-gray-200 dark:border-gray-600'></div>
                </div>
              )}

              <div className='space-y-1'>
                {items.map(item => {
                  const isActive = location.pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <item.icon
                        className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}
                      />
                      {t(`navigation.${item.name}`)}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User info and logout */}
        <div className='border-t border-gray-200 dark:border-gray-700 p-4'>
          <div className='flex items-center gap-3 mb-3'>
            <div className='h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center'>
              <User className='w-4 h-4 text-gray-600 dark:text-gray-300' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                {user?.firstName || 'Usuário'}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                {user?.email || 'user@email.com'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className='flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
          >
            <LogOut className='w-4 h-4' />
            {t('navigation.logout')}
          </button>
        </div>
      </div>
    </>
  )
}
