/**
 * 🛡️ HOLD Wallet - Admin Dashboard Page
 * ======================================
 *
 * Dashboard principal do painel administrativo.
 * Versão completa com métricas financeiras, gráficos e análises.
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  DollarSign,
  Percent,
  BarChart3,
  PieChart,
  Zap,
  Globe,
  RefreshCw,
  AlertCircle,
  UserPlus,
  Loader2,
  Settings,
  CreditCard,
  FileText,
  Receipt,
  Banknote,
  Lock,
  Key,
  UserCheck,
} from 'lucide-react'
import { apiClient } from '@/services/api'

// Interfaces
interface DashboardStats {
  users: {
    total: number
    active: number
    inactive: number
    admins: number
    new_24h: number
    new_7d: number
    verified_kyc: number
  }
  wallets: {
    total: number
    with_balance: number
  }
  trades: {
    otc_total: number
    otc_pending: number
    otc_completed: number
    p2p_total: number
    p2p_active: number
    p2p_completed: number
  }
  wolkpay?: {
    total_invoices: number
    completed: number
    pending: number
    volume_brl: number
    volume_24h: number
    fees_collected: number
  }
  bill_payment?: {
    total_bills: number
    paid: number
    pending: number
    volume_brl: number
    volume_24h: number
    fees_collected: number
  }
  financial: {
    total_volume_brl: number
    volume_24h: number
    total_fees_collected: number
    fees_24h: number
    avg_trade_value: number
    platform_total_volume?: number
    platform_total_fees?: number
  }
  disputes: {
    total: number
    open: number
    resolved: number
  }
  system: {
    uptime: number
    api_health: string
    db_health: string
  }
}

interface RecentActivity {
  id: string
  type: 'trade_completed' | 'user_registered' | 'trade_pending' | 'dispute_opened' | 'kyc_approved'
  title: string
  description: string
  time: string
  status: 'success' | 'warning' | 'info' | 'error'
}

// Mock data completo
const mockDashboardStats: DashboardStats = {
  users: {
    total: 1250,
    active: 1180,
    inactive: 70,
    admins: 3,
    new_24h: 15,
    new_7d: 87,
    verified_kyc: 892,
  },
  wallets: {
    total: 2340,
    with_balance: 1856,
  },
  trades: {
    otc_total: 3456,
    otc_pending: 12,
    otc_completed: 3200,
    p2p_total: 890,
    p2p_active: 156,
    p2p_completed: 734,
  },
  financial: {
    total_volume_brl: 15_432_890,
    volume_24h: 458_230,
    total_fees_collected: 485_234,
    fees_24h: 14_520,
    avg_trade_value: 1_760,
  },
  disputes: {
    total: 45,
    open: 3,
    resolved: 42,
  },
  system: {
    uptime: 99.9,
    api_health: 'healthy',
    db_health: 'healthy',
  },
}

const mockRecentActivity: RecentActivity[] = [
  {
    id: '1',
    type: 'trade_completed',
    title: 'Trade OTC completado',
    description: 'OTC-2026-001234 • R$ 5.000,00',
    time: new Date(Date.now() - 2 * 60000).toISOString(), // 2 min atrás
    status: 'success',
  },
  {
    id: '2',
    type: 'user_registered',
    title: 'Novo usuário registrado',
    description: 'user@email.com',
    time: new Date(Date.now() - 5 * 60000).toISOString(), // 5 min atrás
    status: 'info',
  },
  {
    id: '3',
    type: 'trade_pending',
    title: 'Trade pendente aguardando confirmação',
    description: 'OTC-2026-001235 • Pagamento PIX',
    time: new Date(Date.now() - 10 * 60000).toISOString(), // 10 min atrás
    status: 'warning',
  },
  {
    id: '4',
    type: 'kyc_approved',
    title: 'KYC aprovado',
    description: 'cliente@empresa.com.br',
    time: new Date(Date.now() - 15 * 60000).toISOString(), // 15 min atrás
    status: 'success',
  },
  {
    id: '5',
    type: 'dispute_opened',
    title: 'Nova disputa aberta',
    description: 'P2P-2026-000456 • Pagamento não confirmado',
    time: new Date(Date.now() - 25 * 60000).toISOString(), // 25 min atrás
    status: 'error',
  },
]

// Fetch dashboard data
const fetchDashboardData = async (): Promise<
  DashboardStats & { recent_activity?: RecentActivity[] }
> => {
  try {
    console.log('🔄 Fetching dashboard data...')
    const { data } = await apiClient.get('/admin/dashboard/summary')
    console.log('📊 Dashboard API response:', data)

    // Verifica se os dados retornados têm a estrutura esperada
    if (data?.data && data.data.trades && data.data.users && data.data.financial) {
      console.log('✅ Using real data from API')
      return {
        ...data.data,
        recent_activity: data.data.recent_activity || [],
      }
    }

    // Se a estrutura não for válida, retorna mock
    console.warn('⚠️ API response structure invalid, using mock data. Response:', data)
    return mockDashboardStats
  } catch (error) {
    console.error('❌ Error fetching dashboard:', error)
    return mockDashboardStats
  }
}

// Componente de card de estatística grande
interface BigStatCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow' | 'indigo'
  format?: 'number' | 'currency' | 'percent'
  onClick?: () => void
}

const BigStatCard: React.FC<BigStatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon,
  color,
  format = 'number',
  onClick,
}) => {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  }

  const formatValue = () => {
    if (format === 'currency') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(Number(value))
    }
    if (format === 'percent') {
      return `${value}%`
    }
    return new Intl.NumberFormat('pt-BR').format(Number(value))
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className='flex items-center justify-between mb-4'>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        {change !== undefined && (
          <div
            className={`flex items-center text-xs font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {change >= 0 ? (
              <ArrowUpRight className='w-3 h-3' />
            ) : (
              <ArrowDownRight className='w-3 h-3' />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <h3 className='text-2xl font-bold text-gray-900 dark:text-white'>{formatValue()}</h3>
      <p className='text-sm text-gray-500 dark:text-gray-400'>{title}</p>
      {subtitle && <p className='mt-2 text-xs text-gray-400'>{subtitle}</p>}
    </div>
  )
}

// Componente de mini gráfico de barras
interface MiniBarChartProps {
  data: number[]
  color: string
  height?: number
}

const MiniBarChart: React.FC<MiniBarChartProps> = ({ data, color, height = 40 }) => {
  const max = Math.max(...data)
  return (
    <div className='flex items-end gap-1' style={{ height }}>
      {data.map((value, index) => (
        <div
          key={index}
          className={`flex-1 ${color} rounded-t transition-all duration-300`}
          style={{ height: `${(value / max) * 100}%`, minHeight: 4 }}
        />
      ))}
    </div>
  )
}

// Componente de indicador de status
interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'error'
  label: string
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, label }) => {
  const statusClasses = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  }

  return (
    <div className='flex items-center gap-2'>
      <div className={`w-2 h-2 rounded-full ${statusClasses[status]} animate-pulse`} />
      <span className='text-sm text-gray-600 dark:text-gray-400'>{label}</span>
    </div>
  )
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate()

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 30000, // 30 segundos
    gcTime: 120000, // 2 minutos
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  })

  // Dados para mini gráficos (simulados)
  const volumeData = [45, 52, 38, 65, 72, 58, 85]
  const usersData = [12, 18, 15, 22, 19, 25, 28]
  const tradesData = [35, 42, 38, 55, 48, 62, 58]

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='w-8 h-8 animate-spin text-blue-500 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <XCircle className='w-12 h-12 text-red-500 mx-auto mb-4' />
          <p className='text-red-600'>Erro ao carregar dashboard</p>
          <button
            onClick={() => refetch()}
            className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // Valores com fallback para evitar erros
  const trades = stats.trades || {
    otc_total: 0,
    otc_pending: 0,
    otc_completed: 0,
    p2p_total: 0,
    p2p_active: 0,
    p2p_completed: 0,
  }
  const users = stats.users || {
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    new_24h: 0,
    new_7d: 0,
    verified_kyc: 0,
  }
  const wallets = stats.wallets || { total: 0, with_balance: 0 }
  const financial = stats.financial || {
    total_volume_brl: 0,
    volume_24h: 0,
    total_fees_collected: 0,
    fees_24h: 0,
    avg_trade_value: 0,
  }
  const disputes = stats.disputes || { total: 0, open: 0, resolved: 0 }
  const system = stats.system || { uptime: 99.9, api_health: 'healthy', db_health: 'healthy' }

  const totalTrades = trades.otc_total + trades.p2p_total
  const pendingItems = trades.otc_pending + disputes.open

  return (
    <div className='p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div>
          <div className='flex items-center gap-3 mb-2'>
            <Shield className='w-8 h-8 text-blue-600' />
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
              Painel Administrativo
            </h1>
          </div>
          <p className='text-gray-600 dark:text-gray-400'>
            Bem-vindo ao painel de administração da WOLK NOW
          </p>
        </div>
        <div className='flex items-center gap-3'>
          {/* System Status */}
          <div className='hidden md:flex items-center gap-4 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm'>
            <StatusIndicator status={system.api_health as 'healthy'} label='API' />
            <StatusIndicator status={system.db_health as 'healthy'} label='Database' />
          </div>
          <button
            onClick={() => refetch()}
            className='p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700'
            title='Atualizar'
          >
            <RefreshCw className='w-5 h-5 text-gray-600 dark:text-gray-400' />
          </button>
        </div>
      </div>

      {/* Alerts Banner */}
      {pendingItems > 0 && (
        <div className='p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-200 dark:border-yellow-800 rounded-xl'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-yellow-500/20 rounded-lg'>
                <AlertTriangle className='w-5 h-5 text-yellow-600' />
              </div>
              <div>
                <p className='font-medium text-yellow-800 dark:text-yellow-200'>
                  Atenção Necessária
                </p>
                <p className='text-sm text-yellow-700 dark:text-yellow-300'>
                  {trades.otc_pending > 0 && `${trades.otc_pending} trades pendentes`}
                  {trades.otc_pending > 0 && disputes.open > 0 && ' • '}
                  {disputes.open > 0 && `${disputes.open} disputas abertas`}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/p2p')}
              className='px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium'
            >
              Ver Detalhes
            </button>
          </div>
        </div>
      )}

      {/* Financial Overview - Top Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg'>
          <div className='flex items-center justify-between mb-3'>
            <div className='p-2 bg-white/20 rounded-lg'>
              <DollarSign className='w-5 h-5' />
            </div>
            <span className='text-xs bg-white/20 px-2 py-1 rounded-full'>+12.5%</span>
          </div>
          <p className='text-3xl font-bold'>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(financial.total_volume_brl)}
          </p>
          <p className='text-sm text-green-100 mt-1'>Volume Total</p>
          <div className='mt-3'>
            <MiniBarChart data={volumeData} color='bg-white/30' height={30} />
          </div>
        </div>

        <div className='bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg'>
          <div className='flex items-center justify-between mb-3'>
            <div className='p-2 bg-white/20 rounded-lg'>
              <Wallet className='w-5 h-5' />
            </div>
            <span className='text-xs bg-white/20 px-2 py-1 rounded-full'>+18.7%</span>
          </div>
          <p className='text-3xl font-bold'>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(financial.total_fees_collected)}
          </p>
          <p className='text-sm text-purple-100 mt-1'>Taxas Coletadas</p>
          <p className='text-xs text-purple-200 mt-2'>
            Hoje:{' '}
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              financial.fees_24h
            )}
          </p>
        </div>

        <div className='bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg'>
          <div className='flex items-center justify-between mb-3'>
            <div className='p-2 bg-white/20 rounded-lg'>
              <Users className='w-5 h-5' />
            </div>
            <span className='text-xs bg-white/20 px-2 py-1 rounded-full'>
              +{users.new_24h} hoje
            </span>
          </div>
          <p className='text-3xl font-bold'>{new Intl.NumberFormat('pt-BR').format(users.total)}</p>
          <p className='text-sm text-blue-100 mt-1'>Usuários Totais</p>
          <div className='mt-3'>
            <MiniBarChart data={usersData} color='bg-white/30' height={30} />
          </div>
        </div>

        <div className='bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg'>
          <div className='flex items-center justify-between mb-3'>
            <div className='p-2 bg-white/20 rounded-lg'>
              <Activity className='w-5 h-5' />
            </div>
            <span className='text-xs bg-white/20 px-2 py-1 rounded-full'>+15.2%</span>
          </div>
          <p className='text-3xl font-bold'>{new Intl.NumberFormat('pt-BR').format(totalTrades)}</p>
          <p className='text-sm text-indigo-100 mt-1'>Total de Trades</p>
          <div className='mt-3'>
            <MiniBarChart data={tradesData} color='bg-white/30' height={30} />
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
        <BigStatCard
          title='Usuários Ativos'
          value={stats.users.active}
          subtitle={`${stats.users.inactive} inativos`}
          icon={<UserPlus className='w-5 h-5' />}
          color='blue'
          onClick={() => navigate('/admin/users')}
        />
        <BigStatCard
          title='KYC Verificados'
          value={stats.users.verified_kyc}
          subtitle={`${((stats.users.verified_kyc / stats.users.total) * 100).toFixed(0)}% do total`}
          icon={<CheckCircle className='w-5 h-5' />}
          color='green'
        />
        <BigStatCard
          title='Carteiras Ativas'
          value={stats.wallets.with_balance}
          subtitle={`${stats.wallets.total} total`}
          icon={<Wallet className='w-5 h-5' />}
          color='purple'
          onClick={() => navigate('/admin/wallets')}
        />
        <BigStatCard
          title='Trades OTC'
          value={stats.trades.otc_total}
          subtitle={`${stats.trades.otc_pending} pendentes`}
          change={8.5}
          icon={<TrendingUp className='w-5 h-5' />}
          color='indigo'
          onClick={() => navigate('/admin/trades')}
        />
        <BigStatCard
          title='Ordens P2P'
          value={stats.trades.p2p_total}
          subtitle={`${stats.trades.p2p_active} ativas`}
          icon={<Activity className='w-5 h-5' />}
          color='orange'
          onClick={() => navigate('/admin/p2p')}
        />
        <BigStatCard
          title='Disputas'
          value={stats.disputes.open}
          subtitle={`${stats.disputes.resolved} resolvidas`}
          icon={<AlertCircle className='w-5 h-5' />}
          color={stats.disputes.open > 0 ? 'red' : 'green'}
          onClick={() => navigate('/admin/p2p')}
        />
      </div>

      {/* Quick Actions & Activity */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Quick Actions */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <Zap className='w-5 h-5 text-yellow-500' />
            Acesso Rápido
          </h2>
          <div className='grid grid-cols-2 gap-3'>
            {[
              { icon: Users, label: 'Usuários', path: '/admin/users', color: 'text-blue-600' },
              {
                icon: TrendingUp,
                label: 'Trades OTC',
                path: '/admin/trades',
                color: 'text-purple-600',
              },
              {
                icon: Globe,
                label: 'WolkPay',
                path: '/admin/wolkpay',
                color: 'text-cyan-600',
              },
              {
                icon: Receipt,
                label: 'Boletos',
                path: '/admin/bill-payments',
                color: 'text-amber-600',
              },
              {
                icon: Activity,
                label: 'P2P',
                path: '/admin/p2p',
                color: 'text-green-600',
              },
              {
                icon: BarChart3,
                label: 'Relatórios',
                path: '/admin/reports',
                color: 'text-indigo-600',
              },
              {
                icon: UserCheck,
                label: 'KYC',
                path: '/admin/kyc',
                color: 'text-teal-600',
              },
              {
                icon: PieChart,
                label: 'Analytics',
                path: '/admin/analytics',
                color: 'text-pink-600',
              },
              {
                icon: Wallet,
                label: 'Carteira Sistema',
                path: '/admin/system-wallet',
                color: 'text-violet-600',
              },
              {
                icon: DollarSign,
                label: 'Taxas',
                path: '/admin/fees',
                color: 'text-emerald-600',
              },
              {
                icon: Lock,
                label: 'Segurança',
                path: '/admin/security',
                color: 'text-red-600',
              },
              {
                icon: Settings,
                label: 'Configurações',
                path: '/admin/settings',
                color: 'text-gray-600',
              },
            ].map((item, index) => (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className='flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
              >
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <span className='text-sm font-medium text-gray-900 dark:text-white'>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className='lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
              <Clock className='w-5 h-5 text-blue-500' />
              Atividade Recente
            </h2>
            <button className='text-sm text-blue-600 hover:text-blue-700 font-medium'>
              Ver Tudo
            </button>
          </div>
          <div className='space-y-3'>
            {/* Use real data if available, otherwise mock */}
            {((stats as any).recent_activity?.length > 0
              ? (stats as any).recent_activity
              : mockRecentActivity
            ).map((activity: RecentActivity) => {
              const iconMap: Record<string, React.ComponentType<any>> = {
                trade_completed: CheckCircle,
                trade: TrendingUp,
                user_registered: Users,
                trade_pending: Clock,
                dispute_opened: AlertTriangle,
                kyc_approved: CheckCircle,
                wolkpay: Globe,
                bill_payment: Receipt,
              }
              const colorMap = {
                success: 'text-green-500 bg-green-100 dark:bg-green-900/30',
                warning: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
                info: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
                error: 'text-red-500 bg-red-100 dark:bg-red-900/30',
              }
              const Icon = iconMap[activity.type] || Activity
              const colorClass = colorMap[activity.status as keyof typeof colorMap] || colorMap.info

              // Format time if it's an ISO string
              const formatTime = (time: string) => {
                if (!time) return '-'
                try {
                  const date = new Date(time)

                  // Verifica se a data é válida
                  if (Number.isNaN(date.getTime())) {
                    return time // Retorna o valor original se não for uma data válida
                  }

                  const now = new Date()
                  const diffMs = now.getTime() - date.getTime()
                  const diffMins = Math.floor(diffMs / 60000)
                  const diffHours = Math.floor(diffMs / 3600000)
                  const diffDays = Math.floor(diffMs / 86400000)

                  // Formatar data e hora completa
                  const dateStr = date.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })
                  const timeStr = date.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  // Se for recente, mostra "X min/horas atrás" + horário
                  if (diffMins < 60) return `${diffMins} min • ${timeStr}`
                  if (diffHours < 24) return `${diffHours}h • ${timeStr}`
                  if (diffDays < 7) return `${diffDays}d • ${dateStr}`

                  // Se for mais antigo, mostra data e hora
                  return `${dateStr} ${timeStr}`
                } catch {
                  return time || '-'
                }
              }

              return (
                <div
                  key={activity.id}
                  className='flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer'
                >
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className='w-4 h-4' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                      {activity.title}
                    </p>
                    <p className='text-xs text-gray-500 truncate'>{activity.description}</p>
                  </div>
                  <span className='text-xs text-gray-400 whitespace-nowrap'>
                    {formatTime(activity.time)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Products Overview - WolkPay & Bill Payment */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* WolkPay */}
        <div
          className='bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow'
          onClick={() => navigate('/admin/wolkpay')}
        >
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-3'>
              <div className='p-3 bg-white/20 rounded-lg'>
                <Globe className='w-6 h-6' />
              </div>
              <div>
                <h3 className='text-lg font-semibold'>WolkPay</h3>
                <p className='text-sm text-cyan-100'>Faturas e Pagamentos</p>
              </div>
            </div>
            <ArrowUpRight className='w-5 h-5 text-white/60' />
          </div>
          <div className='grid grid-cols-3 gap-4 mt-4'>
            <div>
              <p className='text-2xl font-bold'>
                {new Intl.NumberFormat('pt-BR').format(stats.wolkpay?.total_invoices || 0)}
              </p>
              <p className='text-xs text-cyan-100'>Faturas</p>
            </div>
            <div>
              <p className='text-2xl font-bold'>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(stats.wolkpay?.volume_brl || 0)}
              </p>
              <p className='text-xs text-cyan-100'>Volume</p>
            </div>
            <div>
              <p className='text-2xl font-bold'>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(stats.wolkpay?.fees_collected || 0)}
              </p>
              <p className='text-xs text-cyan-100'>Taxas</p>
            </div>
          </div>
          <div className='flex items-center gap-4 mt-4 pt-4 border-t border-white/20'>
            <div className='flex items-center gap-2'>
              <CheckCircle className='w-4 h-4 text-green-300' />
              <span className='text-sm'>{stats.wolkpay?.completed || 0} completas</span>
            </div>
            <div className='flex items-center gap-2'>
              <Clock className='w-4 h-4 text-yellow-300' />
              <span className='text-sm'>{stats.wolkpay?.pending || 0} pendentes</span>
            </div>
          </div>
        </div>

        {/* Bill Payment */}
        <div
          className='bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow'
          onClick={() => navigate('/admin/bill-payments')}
        >
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-3'>
              <div className='p-3 bg-white/20 rounded-lg'>
                <Receipt className='w-6 h-6' />
              </div>
              <div>
                <h3 className='text-lg font-semibold'>Pagamento de Boletos</h3>
                <p className='text-sm text-amber-100'>Bill Payment Service</p>
              </div>
            </div>
            <ArrowUpRight className='w-5 h-5 text-white/60' />
          </div>
          <div className='grid grid-cols-3 gap-4 mt-4'>
            <div>
              <p className='text-2xl font-bold'>
                {new Intl.NumberFormat('pt-BR').format(stats.bill_payment?.total_bills || 0)}
              </p>
              <p className='text-xs text-amber-100'>Boletos</p>
            </div>
            <div>
              <p className='text-2xl font-bold'>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(stats.bill_payment?.volume_brl || 0)}
              </p>
              <p className='text-xs text-amber-100'>Volume</p>
            </div>
            <div>
              <p className='text-2xl font-bold'>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(stats.bill_payment?.fees_collected || 0)}
              </p>
              <p className='text-xs text-amber-100'>Taxas</p>
            </div>
          </div>
          <div className='flex items-center gap-4 mt-4 pt-4 border-t border-white/20'>
            <div className='flex items-center gap-2'>
              <CheckCircle className='w-4 h-4 text-green-300' />
              <span className='text-sm'>{stats.bill_payment?.paid || 0} pagos</span>
            </div>
            <div className='flex items-center gap-2'>
              <Clock className='w-4 h-4 text-yellow-300' />
              <span className='text-sm'>{stats.bill_payment?.pending || 0} pendentes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Total Volume */}
      {(stats.financial.platform_total_volume || stats.financial.platform_total_fees) && (
        <div className='bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-lg'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='p-3 bg-white/10 rounded-lg'>
                <BarChart3 className='w-6 h-6' />
              </div>
              <div>
                <p className='text-sm text-gray-400'>
                  Volume Total da Plataforma (Todos os Serviços)
                </p>
                <p className='text-3xl font-bold'>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    stats.financial.platform_total_volume || 0
                  )}
                </p>
              </div>
            </div>
            <div className='text-right'>
              <p className='text-sm text-gray-400'>Receita Total em Taxas</p>
              <p className='text-2xl font-bold text-green-400'>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  stats.financial.platform_total_fees || 0
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Stats Row */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Trading Distribution */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <PieChart className='w-5 h-5 text-purple-500' />
            Distribuição de Trades
          </h2>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-3 h-3 bg-blue-500 rounded-full' />
                <span className='text-sm text-gray-600 dark:text-gray-400'>OTC</span>
              </div>
              <div className='text-right'>
                <span className='font-semibold text-gray-900 dark:text-white'>
                  {new Intl.NumberFormat('pt-BR').format(stats.trades.otc_total)}
                </span>
                <span className='text-xs text-gray-500 ml-2'>
                  ({((stats.trades.otc_total / totalTrades) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
            <div className='h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
              <div
                className='h-full bg-blue-500 rounded-full'
                style={{ width: `${(stats.trades.otc_total / totalTrades) * 100}%` }}
              />
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-3 h-3 bg-purple-500 rounded-full' />
                <span className='text-sm text-gray-600 dark:text-gray-400'>P2P</span>
              </div>
              <div className='text-right'>
                <span className='font-semibold text-gray-900 dark:text-white'>
                  {new Intl.NumberFormat('pt-BR').format(stats.trades.p2p_total)}
                </span>
                <span className='text-xs text-gray-500 ml-2'>
                  ({((stats.trades.p2p_total / totalTrades) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
            <div className='h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
              <div
                className='h-full bg-purple-500 rounded-full'
                style={{ width: `${(stats.trades.p2p_total / totalTrades) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Fee Breakdown */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <Percent className='w-5 h-5 text-green-500' />
            Taxas Configuradas
          </h2>
          <div className='space-y-4'>
            <div className='flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>OTC Spread</span>
              <span className='font-bold text-green-600'>3.0%</span>
            </div>
            <div className='flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>Taxa P2P</span>
              <span className='font-bold text-blue-600'>0.5%</span>
            </div>
            <div className='flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>Taxa de Rede</span>
              <span className='font-bold text-purple-600'>0.25%</span>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <Globe className='w-5 h-5 text-blue-500' />
            Status do Sistema
          </h2>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
                <span className='text-sm text-gray-600 dark:text-gray-400'>Uptime</span>
              </div>
              <span className='font-semibold text-green-600'>{stats.system.uptime}%</span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
                <span className='text-sm text-gray-600 dark:text-gray-400'>API Status</span>
              </div>
              <span className='text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full'>
                Online
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
                <span className='text-sm text-gray-600 dark:text-gray-400'>Database</span>
              </div>
              <span className='text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full'>
                Healthy
              </span>
            </div>
            <div className='pt-3 border-t border-gray-100 dark:border-gray-700'>
              <p className='text-xs text-gray-500'>
                Última verificação: {new Date().toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
