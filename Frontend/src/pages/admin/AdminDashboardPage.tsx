/**
 * 🛡️ HOLD Wallet - Admin Dashboard Page
 * ======================================
 *
 * Dashboard principal do painel administrativo.
 */

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  BarChart3,
  Shield,
} from 'lucide-react'

interface DashboardStats {
  users: {
    total: number
    active: number
    inactive: number
    admins: number
    new_24h: number
    new_7d: number
  }
  wallets: {
    total: number
  }
  trades_otc: {
    total: number
    pending: number
    completed: number
  }
  p2p: {
    total_orders: number
    active_orders: number
    open_disputes: number
  }
  alerts: {
    pending_trades: number
    open_disputes: number
  }
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      // TODO: Integrar com API
      // const response = await adminService.getDashboardSummary()

      // Mock data por enquanto
      setStats({
        users: {
          total: 1250,
          active: 1180,
          inactive: 70,
          admins: 3,
          new_24h: 15,
          new_7d: 87,
        },
        wallets: {
          total: 2340,
        },
        trades_otc: {
          total: 3456,
          pending: 12,
          completed: 3200,
        },
        p2p: {
          total_orders: 890,
          active_orders: 156,
          open_disputes: 3,
        },
        alerts: {
          pending_trades: 12,
          open_disputes: 3,
        },
      })
    } catch (err) {
      setError('Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <RefreshCw className='w-8 h-8 animate-spin text-blue-500 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <XCircle className='w-12 h-12 text-red-500 mx-auto mb-4' />
          <p className='text-red-600'>{error}</p>
          <button
            onClick={fetchStats}
            className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-6'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-2'>
          <Shield className='w-8 h-8 text-blue-600' />
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            Painel Administrativo
          </h1>
        </div>
        <p className='text-gray-600 dark:text-gray-400'>
          Bem-vindo ao painel de administração do HOLDWallet
        </p>
      </div>

      {/* Alerts */}
      {stats && (stats.alerts.pending_trades > 0 || stats.alerts.open_disputes > 0) && (
        <div className='mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
          <div className='flex items-center gap-2 text-yellow-800 dark:text-yellow-200'>
            <AlertTriangle className='w-5 h-5' />
            <span className='font-medium'>Atenção Necessária</span>
          </div>
          <div className='mt-2 flex gap-4'>
            {stats.alerts.pending_trades > 0 && (
              <span className='text-sm text-yellow-700 dark:text-yellow-300'>
                {stats.alerts.pending_trades} trades pendentes
              </span>
            )}
            {stats.alerts.open_disputes > 0 && (
              <span className='text-sm text-yellow-700 dark:text-yellow-300'>
                {stats.alerts.open_disputes} disputas abertas
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        {/* Users Card */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
              <Users className='w-6 h-6 text-blue-600 dark:text-blue-400' />
            </div>
            <span className='text-xs text-green-500 font-medium'>+{stats?.users.new_24h} hoje</span>
          </div>
          <h3 className='text-2xl font-bold text-gray-900 dark:text-white'>
            {stats?.users.total.toLocaleString()}
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>Total de Usuários</p>
          <div className='mt-3 text-xs text-gray-500'>
            {stats?.users.active} ativos • {stats?.users.admins} admins
          </div>
        </div>

        {/* Wallets Card */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-3 bg-green-100 dark:bg-green-900/30 rounded-lg'>
              <Wallet className='w-6 h-6 text-green-600 dark:text-green-400' />
            </div>
          </div>
          <h3 className='text-2xl font-bold text-gray-900 dark:text-white'>
            {stats?.wallets.total.toLocaleString()}
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>Carteiras Criadas</p>
        </div>

        {/* Trades OTC Card */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg'>
              <TrendingUp className='w-6 h-6 text-purple-600 dark:text-purple-400' />
            </div>
            {stats?.trades_otc.pending && stats.trades_otc.pending > 0 && (
              <span className='text-xs text-orange-500 font-medium'>
                {stats.trades_otc.pending} pendentes
              </span>
            )}
          </div>
          <h3 className='text-2xl font-bold text-gray-900 dark:text-white'>
            {stats?.trades_otc.total.toLocaleString()}
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>Trades OTC</p>
          <div className='mt-3 text-xs text-gray-500'>{stats?.trades_otc.completed} concluídos</div>
        </div>

        {/* P2P Card */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg'>
              <Activity className='w-6 h-6 text-orange-600 dark:text-orange-400' />
            </div>
            {stats?.p2p.open_disputes && stats.p2p.open_disputes > 0 && (
              <span className='text-xs text-red-500 font-medium'>
                {stats.p2p.open_disputes} disputas
              </span>
            )}
          </div>
          <h3 className='text-2xl font-bold text-gray-900 dark:text-white'>
            {stats?.p2p.total_orders.toLocaleString()}
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>Ordens P2P</p>
          <div className='mt-3 text-xs text-gray-500'>{stats?.p2p.active_orders} ativas</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
        <button
          onClick={() => navigate('/admin/users')}
          className='flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow'
        >
          <div className='flex items-center gap-3'>
            <Users className='w-5 h-5 text-blue-600' />
            <span className='font-medium text-gray-900 dark:text-white'>Usuários</span>
          </div>
          <ArrowRight className='w-4 h-4 text-gray-400' />
        </button>

        <button
          onClick={() => navigate('/admin/trades')}
          className='flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow'
        >
          <div className='flex items-center gap-3'>
            <TrendingUp className='w-5 h-5 text-purple-600' />
            <span className='font-medium text-gray-900 dark:text-white'>Trades OTC</span>
          </div>
          <ArrowRight className='w-4 h-4 text-gray-400' />
        </button>

        <button
          onClick={() => navigate('/admin/disputes')}
          className='flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow'
        >
          <div className='flex items-center gap-3'>
            <AlertTriangle className='w-5 h-5 text-orange-600' />
            <span className='font-medium text-gray-900 dark:text-white'>Disputas</span>
          </div>
          <ArrowRight className='w-4 h-4 text-gray-400' />
        </button>

        <button
          onClick={() => navigate('/admin/reports')}
          className='flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow'
        >
          <div className='flex items-center gap-3'>
            <BarChart3 className='w-5 h-5 text-green-600' />
            <span className='font-medium text-gray-900 dark:text-white'>Relatórios</span>
          </div>
          <ArrowRight className='w-4 h-4 text-gray-400' />
        </button>
      </div>

      {/* Recent Activity */}
      <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
          Atividade Recente
        </h2>
        <div className='space-y-4'>
          <div className='flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
            <CheckCircle className='w-5 h-5 text-green-500' />
            <div className='flex-1'>
              <p className='text-sm text-gray-900 dark:text-white'>Trade OTC completado</p>
              <p className='text-xs text-gray-500'>OTC-2026-001234 • R$ 5.000,00</p>
            </div>
            <span className='text-xs text-gray-400'>2 min atrás</span>
          </div>

          <div className='flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
            <Users className='w-5 h-5 text-blue-500' />
            <div className='flex-1'>
              <p className='text-sm text-gray-900 dark:text-white'>Novo usuário registrado</p>
              <p className='text-xs text-gray-500'>user@email.com</p>
            </div>
            <span className='text-xs text-gray-400'>5 min atrás</span>
          </div>

          <div className='flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
            <Clock className='w-5 h-5 text-yellow-500' />
            <div className='flex-1'>
              <p className='text-sm text-gray-900 dark:text-white'>
                Trade pendente aguardando confirmação
              </p>
              <p className='text-xs text-gray-500'>OTC-2026-001235 • Pagamento PIX</p>
            </div>
            <span className='text-xs text-gray-400'>10 min atrás</span>
          </div>
        </div>
      </div>
    </div>
  )
}
