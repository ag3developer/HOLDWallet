/**
 * GatewayLayout - Layout específico para o portal de merchants
 * Design limpo e profissional para B2B
 */

import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CreditCard,
  Key,
  Webhook,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  HelpCircle,
  FileText,
  Bell,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { getCrossAppUrl } from '@/utils/domainDetection'

// Menu items for merchant dashboard
const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/payments', label: 'Pagamentos', icon: CreditCard },
  { path: '/api-keys', label: 'API Keys', icon: Key },
  { path: '/webhooks', label: 'Webhooks', icon: Webhook },
  { path: '/settings', label: 'Configurações', icon: Settings },
]

const secondaryItems = [
  { path: '/docs', label: 'Documentação', icon: FileText, external: true },
  { path: '/support', label: 'Suporte', icon: HelpCircle },
]

export function GatewayLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900'>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <button
          type='button'
          className='fixed inset-0 bg-black/50 z-40 lg:hidden cursor-default'
          onClick={() => setSidebarOpen(false)}
          aria-label='Fechar menu lateral'
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        {/* Logo */}
        <div className='h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center'>
              <CreditCard className='w-5 h-5 text-white' />
            </div>
            <div>
              <h1 className='text-lg font-bold text-slate-900 dark:text-white'>WolkPay</h1>
              <p className='text-xs text-slate-500 dark:text-slate-400'>Gateway</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className='lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            aria-label='Fechar menu'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Navigation */}
        <nav className='p-4 space-y-1'>
          {menuItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-indigo-500' : ''}`} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Divider */}
        <div className='mx-4 border-t border-slate-200 dark:border-slate-700' />

        {/* Secondary Navigation */}
        <nav className='p-4 space-y-1'>
          {secondaryItems.map(item => {
            const Icon = item.icon
            return (
              <a
                key={item.path}
                href={item.external ? `https://docs.wolknow.com${item.path}` : item.path}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className='flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white transition-all'
              >
                <Icon className='w-5 h-5' />
                {item.label}
              </a>
            )
          })}
        </nav>

        {/* User Info at Bottom */}
        <div className='absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'>
          <div className='flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50'>
            <div className='w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center'>
              <Building2 className='w-5 h-5 text-indigo-600 dark:text-indigo-400' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-slate-900 dark:text-white truncate'>
                {user?.firstName || user?.username || 'Merchant'}
              </p>
              <p className='text-xs text-slate-500 dark:text-slate-400 truncate'>{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className='lg:pl-64'>
        {/* Top Header */}
        <header className='sticky top-0 z-30 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'>
          <div className='h-full px-4 lg:px-8 flex items-center justify-between'>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className='lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              aria-label='Abrir menu'
            >
              <Menu className='w-6 h-6' />
            </button>

            {/* Page Title (mobile) */}
            <div className='lg:hidden flex items-center gap-2'>
              <CreditCard className='w-5 h-5 text-indigo-600' />
              <span className='font-semibold text-slate-900 dark:text-white'>WolkPay</span>
            </div>

            {/* Spacer */}
            <div className='hidden lg:block' />

            {/* Right Actions */}
            <div className='flex items-center gap-4'>
              {/* Notifications */}
              <button
                className='p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 relative'
                aria-label='Notificações'
              >
                <Bell className='w-5 h-5' />
                <span className='absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full' />
              </button>

              {/* User Menu */}
              <div className='relative'>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className='flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                  aria-label='Menu do usuário'
                >
                  <div className='w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center'>
                    <Building2 className='w-4 h-4 text-indigo-600 dark:text-indigo-400' />
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <button
                      type='button'
                      className='fixed inset-0 z-40 cursor-default'
                      onClick={() => setUserMenuOpen(false)}
                      aria-label='Fechar menu'
                    />
                    <div className='absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50'>
                      <div className='p-4 border-b border-slate-200 dark:border-slate-700'>
                        <p className='text-sm font-medium text-slate-900 dark:text-white'>
                          {user?.firstName || user?.username || 'Merchant'}
                        </p>
                        <p className='text-xs text-slate-500 dark:text-slate-400 mt-1'>
                          {user?.email}
                        </p>
                      </div>
                      <div className='p-2'>
                        <NavLink
                          to='/settings'
                          onClick={() => setUserMenuOpen(false)}
                          className='flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        >
                          <Settings className='w-4 h-4' />
                          Configurações
                        </NavLink>
                        <a
                          href={getCrossAppUrl('main', '/')}
                          className='flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        >
                          <LayoutDashboard className='w-4 h-4' />
                          Ir para Wolknow
                        </a>
                        <button
                          onClick={handleLogout}
                          className='w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        >
                          <LogOut className='w-4 h-4' />
                          Sair
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className='p-4 lg:p-8'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default GatewayLayout
