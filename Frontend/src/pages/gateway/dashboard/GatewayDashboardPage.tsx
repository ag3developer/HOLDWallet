/**
 * WolkPay Gateway - Dashboard Principal
 * Visão geral das estatísticas e métricas do merchant
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Key,
  Webhook,
  Settings,
  RefreshCw,
  ChevronRight,
  Zap,
  BarChart3,
  PieChart,
  Calendar,
} from 'lucide-react'
import {
  getMerchantProfile,
  getMerchantStats,
  getPayments,
  type MerchantProfile,
  type MerchantStats,
  type PaymentListItem,
  getStatusBadgeColor,
  getStatusLabel,
} from '../../../services/gatewayService'

export default function GatewayDashboardPage() {
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null)
  const [stats, setStats] = useState<MerchantStats | null>(null)
  const [recentPayments, setRecentPayments] = useState<PaymentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [profileData, statsData, paymentsData] = await Promise.all([
        getMerchantProfile(),
        getMerchantStats(),
        getPayments({ per_page: 5 }),
      ])

      setMerchant(profileData)
      setStats(statsData)
      setRecentPayments(paymentsData.payments || [])
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
      setError('Não foi possível carregar os dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'CONFIRMED':
        return <CheckCircle className='w-4 h-4 text-emerald-500' />
      case 'PENDING':
      case 'PROCESSING':
        return <Clock className='w-4 h-4 text-amber-500' />
      case 'FAILED':
      case 'CANCELLED':
        return <XCircle className='w-4 h-4 text-red-500' />
      default:
        return <AlertCircle className='w-4 h-4 text-slate-400' />
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center'>
        <div className='text-center'>
          <RefreshCw className='w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4' />
          <p className='text-slate-600 dark:text-slate-400'>Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4'>
        <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center'>
          <AlertCircle className='w-16 h-16 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-semibold text-slate-900 dark:text-white mb-2'>
            Erro ao carregar
          </h2>
          <p className='text-slate-600 dark:text-slate-400 mb-6'>{error}</p>
          <button
            onClick={loadDashboardData}
            className='px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors'
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900'>
      {/* Header */}
      <header className='bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div>
              <h1 className='text-2xl font-bold text-slate-900 dark:text-white'>WolkPay Gateway</h1>
              <p className='text-slate-600 dark:text-slate-400 mt-1'>
                {merchant?.business_name || 'Dashboard do Merchant'}
              </p>
            </div>

            <div className='flex items-center gap-3'>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className='p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50'
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                to='/gateway/settings'
                className='p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors'
              >
                <Settings className='w-5 h-5' />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Stats Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          {/* Total Volume */}
          <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700'>
            <div className='flex items-center justify-between mb-4'>
              <div className='p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl'>
                <DollarSign className='w-6 h-6 text-emerald-600 dark:text-emerald-400' />
              </div>
              {stats?.volume_change !== undefined && (
                <span
                  className={`flex items-center text-sm font-medium ${stats.volume_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {stats.volume_change >= 0 ? (
                    <TrendingUp className='w-4 h-4 mr-1' />
                  ) : (
                    <TrendingDown className='w-4 h-4 mr-1' />
                  )}
                  {Math.abs(stats.volume_change)}%
                </span>
              )}
            </div>
            <p className='text-sm text-slate-600 dark:text-slate-400 mb-1'>Volume Total</p>
            <p className='text-2xl font-bold text-slate-900 dark:text-white'>
              {formatCurrency(stats?.total_volume || 0)}
            </p>
          </div>

          {/* Total Transactions */}
          <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700'>
            <div className='flex items-center justify-between mb-4'>
              <div className='p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl'>
                <CreditCard className='w-6 h-6 text-indigo-600 dark:text-indigo-400' />
              </div>
              {stats?.transactions_change !== undefined && (
                <span
                  className={`flex items-center text-sm font-medium ${stats.transactions_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {stats.transactions_change >= 0 ? (
                    <ArrowUpRight className='w-4 h-4 mr-1' />
                  ) : (
                    <ArrowDownRight className='w-4 h-4 mr-1' />
                  )}
                  {Math.abs(stats.transactions_change)}%
                </span>
              )}
            </div>
            <p className='text-sm text-slate-600 dark:text-slate-400 mb-1'>Total Transações</p>
            <p className='text-2xl font-bold text-slate-900 dark:text-white'>
              {stats?.total_transactions?.toLocaleString('pt-BR') || 0}
            </p>
          </div>

          {/* Success Rate */}
          <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700'>
            <div className='flex items-center justify-between mb-4'>
              <div className='p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl'>
                <Activity className='w-6 h-6 text-blue-600 dark:text-blue-400' />
              </div>
            </div>
            <p className='text-sm text-slate-600 dark:text-slate-400 mb-1'>Taxa de Sucesso</p>
            <p className='text-2xl font-bold text-slate-900 dark:text-white'>
              {stats?.success_rate?.toFixed(1) || 0}%
            </p>
            <div className='mt-2 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden'>
              <div
                className='h-full bg-emerald-500 rounded-full transition-all duration-500'
                style={{ width: `${stats?.success_rate || 0}%` }}
              />
            </div>
          </div>

          {/* Pending */}
          <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700'>
            <div className='flex items-center justify-between mb-4'>
              <div className='p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl'>
                <Clock className='w-6 h-6 text-amber-600 dark:text-amber-400' />
              </div>
            </div>
            <p className='text-sm text-slate-600 dark:text-slate-400 mb-1'>Pendentes</p>
            <p className='text-2xl font-bold text-slate-900 dark:text-white'>
              {stats?.pending_payments || 0}
            </p>
            <p className='text-sm text-slate-500 dark:text-slate-500 mt-1'>
              {formatCurrency(stats?.pending_volume || 0)}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8'>
          <Link
            to='/gateway/payments'
            className='bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group'
          >
            <BarChart3 className='w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform' />
            <p className='font-medium text-slate-900 dark:text-white'>Pagamentos</p>
            <p className='text-sm text-slate-500 dark:text-slate-400'>Ver todos</p>
          </Link>

          <Link
            to='/gateway/api-keys'
            className='bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group'
          >
            <Key className='w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform' />
            <p className='font-medium text-slate-900 dark:text-white'>API Keys</p>
            <p className='text-sm text-slate-500 dark:text-slate-400'>Gerenciar</p>
          </Link>

          <Link
            to='/gateway/webhooks'
            className='bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group'
          >
            <Webhook className='w-8 h-8 text-purple-600 dark:text-purple-400 mb-3 group-hover:scale-110 transition-transform' />
            <p className='font-medium text-slate-900 dark:text-white'>Webhooks</p>
            <p className='text-sm text-slate-500 dark:text-slate-400'>Configurar</p>
          </Link>

          <Link
            to='/gateway/settings'
            className='bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group'
          >
            <Settings className='w-8 h-8 text-slate-600 dark:text-slate-400 mb-3 group-hover:scale-110 transition-transform' />
            <p className='font-medium text-slate-900 dark:text-white'>Configurações</p>
            <p className='text-sm text-slate-500 dark:text-slate-400'>Ajustar</p>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Recent Payments */}
          <div className='lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700'>
            <div className='p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg'>
                  <CreditCard className='w-5 h-5 text-indigo-600 dark:text-indigo-400' />
                </div>
                <h2 className='text-lg font-semibold text-slate-900 dark:text-white'>
                  Pagamentos Recentes
                </h2>
              </div>
              <Link
                to='/gateway/payments'
                className='text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1'
              >
                Ver todos
                <ChevronRight className='w-4 h-4' />
              </Link>
            </div>

            <div className='divide-y divide-slate-100 dark:divide-slate-700'>
              {recentPayments.length === 0 ? (
                <div className='p-8 text-center'>
                  <CreditCard className='w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3' />
                  <p className='text-slate-500 dark:text-slate-400'>Nenhum pagamento ainda</p>
                </div>
              ) : (
                recentPayments.map(payment => (
                  <Link
                    key={payment.id}
                    to={`/gateway/payments/${payment.id}`}
                    className='block p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        {getStatusIcon(payment.status)}
                        <div>
                          <p className='font-medium text-slate-900 dark:text-white'>
                            {payment.payment_code}
                          </p>
                          <p className='text-sm text-slate-500 dark:text-slate-400'>
                            {formatDate(payment.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className='text-right'>
                        <p className='font-semibold text-slate-900 dark:text-white'>
                          {formatCurrency(payment.amount)}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeColor(payment.status)}`}
                        >
                          {getStatusLabel(payment.status)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className='space-y-6'>
            {/* Status Card */}
            <div className='bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white'>
              <div className='flex items-center gap-3 mb-4'>
                <Zap className='w-6 h-6' />
                <span className='font-semibold'>Status da Conta</span>
              </div>
              <div className='flex items-center gap-2 mb-4'>
                <span
                  className={`w-3 h-3 rounded-full ${merchant?.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`}
                />
                <span className='text-white/90'>
                  {merchant?.status === 'ACTIVE' ? 'Ativa' : merchant?.status || 'Pendente'}
                </span>
              </div>
              <div className='text-sm text-white/70'>
                Desde{' '}
                {merchant?.created_at
                  ? new Date(merchant.created_at).toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : '-'}
              </div>
            </div>

            {/* Payment Methods Distribution */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg'>
                  <PieChart className='w-5 h-5 text-purple-600 dark:text-purple-400' />
                </div>
                <h3 className='font-semibold text-slate-900 dark:text-white'>
                  Métodos de Pagamento
                </h3>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='w-3 h-3 rounded-full bg-emerald-500' />
                    <span className='text-sm text-slate-600 dark:text-slate-400'>PIX</span>
                  </div>
                  <span className='text-sm font-medium text-slate-900 dark:text-white'>
                    {stats?.pix_percentage?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='w-3 h-3 rounded-full bg-indigo-500' />
                    <span className='text-sm text-slate-600 dark:text-slate-400'>Crypto</span>
                  </div>
                  <span className='text-sm font-medium text-slate-900 dark:text-white'>
                    {stats?.crypto_percentage?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>

              <div className='mt-4 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex'>
                <div
                  className='h-full bg-emerald-500'
                  style={{ width: `${stats?.pix_percentage || 50}%` }}
                />
                <div
                  className='h-full bg-indigo-500'
                  style={{ width: `${stats?.crypto_percentage || 50}%` }}
                />
              </div>
            </div>

            {/* Today Stats */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg'>
                  <Calendar className='w-5 h-5 text-amber-600 dark:text-amber-400' />
                </div>
                <h3 className='font-semibold text-slate-900 dark:text-white'>Hoje</h3>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-sm text-slate-500 dark:text-slate-400 mb-1'>Transações</p>
                  <p className='text-xl font-bold text-slate-900 dark:text-white'>
                    {stats?.today_transactions || 0}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-slate-500 dark:text-slate-400 mb-1'>Volume</p>
                  <p className='text-xl font-bold text-slate-900 dark:text-white'>
                    {formatCurrency(stats?.today_volume || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
