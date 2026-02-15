/**
 * 🛡️ HOLD Wallet - Admin Sidebar
 * ===============================
 *
 * Sidebar específico para o painel administrativo.
 */

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  DollarSign,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  BarChart3,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Wallet,
  Activity,
  Banknote,
  Landmark,
  CreditCard,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Receipt,
  Lock,
  PiggyBank,
  Gift,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useThemeStore } from '@/stores/useThemeStore'

const adminNavigation = [
  // Dashboard
  { name: 'Dashboard Admin', href: '/admin', icon: LayoutDashboard, group: 'overview' },

  // Gestão
  { name: 'Usuários', href: '/admin/users', icon: Users, group: 'management' },
  { name: 'Verificação KYC', href: '/admin/kyc', icon: ShieldCheck, group: 'management' },
  { name: 'KYC - Gestão Usuários', href: '/admin/kyc/users', icon: UserCheck, group: 'management' },
  { name: 'Trades OTC', href: '/admin/trades', icon: TrendingUp, group: 'management' },
  { name: 'P2P & Disputas', href: '/admin/p2p', icon: UserCheck, group: 'management' },
  { name: 'WolkPay', href: '/admin/wolkpay', icon: CreditCard, group: 'management' },
  { name: 'Boletos', href: '/admin/bill-payment', icon: Receipt, group: 'management' },
  { name: 'Carteiras', href: '/admin/wallets', icon: Wallet, group: 'management' },
  { name: 'Saldos Bloqueados', href: '/admin/locked-balances', icon: Lock, group: 'management' },
  { name: 'Transações', href: '/admin/transactions', icon: Activity, group: 'management' },
  { name: 'Taxas & Receita', href: '/admin/fees', icon: Banknote, group: 'management' },
  { name: 'EarnPool', href: '/admin/earnpool', icon: PiggyBank, group: 'management' },
  { name: 'WOLK FRIENDS', href: '/admin/referral', icon: Gift, group: 'management' },
  { name: 'Carteira Sistema', href: '/admin/system-wallet', icon: Landmark, group: 'management' },

  // Relatórios
  { name: 'Relatórios', href: '/admin/reports', icon: FileText, group: 'reports' },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, group: 'reports' },

  // Sistema
  { name: 'Segurança', href: '/admin/security', icon: Shield, group: 'system' },
  { name: 'Configurações', href: '/admin/settings', icon: Settings, group: 'system' },
]

const groupLabels: Record<string, string> = {
  overview: '',
  management: 'Gestão',
  reports: 'Relatórios',
  system: 'Sistema',
}

export const AdminSidebar = () => {
  const location = useLocation()
  const { logout, user } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    overview: true,
    management: true,
    reports: true,
    system: true,
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
  const organizedNavigation = adminNavigation.reduce(
    (groups, item) => {
      if (!groups[item.group]) {
        groups[item.group] = []
      }
      groups[item.group]?.push(item)
      return groups
    },
    {} as Record<string, typeof adminNavigation>
  )

  const SidebarContent = () => (
    <div className='flex flex-col h-full bg-gray-900'>
      {/* Header */}
      <div className='p-4 border-b border-gray-800'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center'>
            <Shield className='w-6 h-6 text-white' />
          </div>
          <div>
            <h1 className='text-lg font-bold text-white'>Admin Panel</h1>
            <p className='text-xs text-gray-400'>WOLK NOW</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className='flex-1 overflow-y-auto p-3 space-y-1'>
        {Object.entries(organizedNavigation).map(([groupKey, items]) => (
          <div key={groupKey} className='mb-2'>
            {/* Group Label */}
            {groupLabels[groupKey] && (
              <button
                onClick={() => toggleGroup(groupKey)}
                className='w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400'
              >
                <span>{groupLabels[groupKey]}</span>
                {expandedGroups[groupKey] ? (
                  <ChevronDown className='w-3 h-3' />
                ) : (
                  <ChevronRight className='w-3 h-3' />
                )}
              </button>
            )}

            {/* Group Items */}
            {(groupLabels[groupKey] === '' || expandedGroups[groupKey]) && (
              <div className='space-y-1'>
                {items.map(item => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                        ${
                          isActive
                            ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }
                      `}
                    >
                      <item.icon className='w-5 h-5 flex-shrink-0' />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div className='p-3 border-t border-gray-800'>
        {/* User Info */}
        <div className='flex items-center gap-3 px-3 py-3 mb-2'>
          <div className='w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold'>
            {user?.username?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-medium text-white truncate'>{user?.username || 'Admin'}</p>
            <p className='text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded inline-block'>
              ADMIN
            </p>
          </div>
        </div>

        {/* Theme Selector */}
        <div className='px-3 py-2 mb-2'>
          <p className='text-xs text-gray-500 mb-2'>Tema</p>
          <div className='flex bg-gray-800 rounded-lg p-1'>
            <button
              onClick={() => setTheme('light')}
              title='Tema Claro'
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                theme === 'light'
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sun className='w-3.5 h-3.5' />
              <span className='hidden sm:inline'>Claro</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              title='Tema Escuro'
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Moon className='w-3.5 h-3.5' />
              <span className='hidden sm:inline'>Escuro</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              title='Tema do Sistema'
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                theme === 'system'
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Monitor className='w-3.5 h-3.5' />
              <span className='hidden sm:inline'>Auto</span>
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className='w-full flex items-center justify-center gap-2 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors'
        >
          <LogOut className='w-5 h-5' />
          <span className='text-sm font-medium'>Sair</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className='lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 text-white rounded-lg shadow-lg'
      >
        {isMobileOpen ? <X className='w-6 h-6' /> : <Menu className='w-6 h-6' />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className='lg:hidden fixed inset-0 bg-black/50 z-40'
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`
          lg:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className='hidden lg:block w-64 h-screen fixed left-0 top-0'>
        <SidebarContent />
      </div>
    </>
  )
}
