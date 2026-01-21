/**
 * 🛡️ HOLD Wallet - Admin Analytics Page
 * ======================================
 *
 * Página de analytics e métricas avançadas.
 * Usa React Query para cache e performance.
 */

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  ArrowRightLeft,
  DollarSign,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Activity,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Globe,
  Loader2,
} from 'lucide-react'
import { apiClient } from '@/services/api'

// Interfaces
interface AnalyticsData {
  overview: {
    total_users: number
    active_users_24h: number
    total_volume_brl: number
    total_trades: number
    total_fees_collected: number
    conversion_rate: number
  }
  growth: {
    users_growth: number
    volume_growth: number
    trades_growth: number
    fees_growth: number
  }
  trading: {
    otc_trades: number
    p2p_trades: number
    avg_trade_value: number
    most_traded_crypto: string
  }
  wolkpay?: {
    invoices_completed: number
    volume_brl: number
    fees_collected: number
  }
  bill_payment?: {
    bills_paid: number
    volume_brl: number
    fees_collected: number
  }
  total_platform_volume?: number
  timeframes: {
    daily: { date: string; volume: number; trades: number }[]
    weekly: { week: string; volume: number; trades: number }[]
  }
  period?: string
  generated_at?: string
}

// Fetch analytics data - SEM FALLBACK MOCK
const fetchAnalytics = async (period: string): Promise<AnalyticsData> => {
  const { data } = await apiClient.get(`/admin/analytics/overview?period=${period}`)
  return data.data
}

// Componente de Card de Estatística
interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'indigo'
  format?: 'number' | 'currency' | 'percent'
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
  format = 'number',
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    indigo: 'from-indigo-500 to-indigo-600',
  }

  const formatValue = () => {
    if (format === 'currency') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(Number(value))
    }
    if (format === 'percent') {
      return `${value}%`
    }
    return new Intl.NumberFormat('pt-BR').format(Number(value))
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-5 text-white shadow-lg`}>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-white/80 mb-1'>{title}</p>
          <p className='text-2xl font-bold'>{formatValue()}</p>
          {change !== undefined && (
            <div className='flex items-center mt-2'>
              {change >= 0 ? (
                <ArrowUpRight className='w-4 h-4 text-green-200' />
              ) : (
                <ArrowDownRight className='w-4 h-4 text-red-200' />
              )}
              <span className={`text-sm ml-1 ${change >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {Math.abs(change)}% vs período anterior
              </span>
            </div>
          )}
        </div>
        <div className='p-3 bg-white/20 rounded-lg'>{icon}</div>
      </div>
    </div>
  )
}

// Componente de gráfico simples (barra)
interface SimpleBarChartProps {
  data: { label: string; value: number }[]
  maxValue: number
  color: string
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, maxValue, color }) => {
  return (
    <div className='space-y-3'>
      {data.map((item, index) => (
        <div key={index}>
          <div className='flex justify-between text-sm mb-1'>
            <span className='text-gray-600 dark:text-gray-400'>{item.label}</span>
            <span className='text-gray-900 dark:text-white font-medium'>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                item.value
              )}
            </span>
          </div>
          <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
            <div
              className={`h-full ${color} rounded-full transition-all duration-500`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export const AdminAnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ['admin-analytics', timeRange],
    queryFn: () => fetchAnalytics(timeRange),
    staleTime: 120000, // 2 minutos
    gcTime: 600000, // 10 minutos
    retry: 2,
  })

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='w-8 h-8 animate-spin text-blue-500 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>Carregando analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <AlertTriangle className='w-8 h-8 text-yellow-500 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>Erro ao carregar analytics</p>
          <button
            onClick={() => refetch()}
            className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  // Dados para gráficos
  const volumeData = analytics.timeframes.daily.map(d => ({
    label: d.date,
    value: d.volume,
  }))
  const maxVolume = Math.max(...volumeData.map(d => d.value))

  return (
    <div className='p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div>
          <div className='flex items-center gap-3 mb-2'>
            <BarChart3 className='w-8 h-8 text-indigo-600' />
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Analytics</h1>
          </div>
          <p className='text-gray-600 dark:text-gray-400'>
            Métricas e análises detalhadas da plataforma
          </p>
        </div>
        <div className='flex items-center gap-3'>
          {/* Time Range Selector */}
          <div className='flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm'>
            {(['7d', '30d', '90d', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {range === '7d' && '7 Dias'}
                {range === '30d' && '30 Dias'}
                {range === '90d' && '90 Dias'}
                {range === 'all' && 'Tudo'}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className='p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700'
            title='Atualizar dados'
          >
            <RefreshCw className='w-5 h-5 text-gray-600 dark:text-gray-400' />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        <StatCard
          title='Volume Total'
          value={analytics.overview.total_volume_brl}
          change={analytics.growth.volume_growth}
          icon={<DollarSign className='w-6 h-6' />}
          color='green'
          format='currency'
        />
        <StatCard
          title='Total de Trades'
          value={analytics.overview.total_trades}
          change={analytics.growth.trades_growth}
          icon={<ArrowRightLeft className='w-6 h-6' />}
          color='blue'
        />
        <StatCard
          title='Taxas Coletadas'
          value={analytics.overview.total_fees_collected}
          change={analytics.growth.fees_growth}
          icon={<Wallet className='w-6 h-6' />}
          color='purple'
          format='currency'
        />
        <StatCard
          title='Total de Usuários'
          value={analytics.overview.total_users}
          change={analytics.growth.users_growth}
          icon={<Users className='w-6 h-6' />}
          color='indigo'
        />
        <StatCard
          title='Usuários Ativos (24h)'
          value={analytics.overview.active_users_24h}
          icon={<Activity className='w-6 h-6' />}
          color='yellow'
        />
        <StatCard
          title='Taxa de Conversão'
          value={analytics.overview.conversion_rate}
          icon={<Target className='w-6 h-6' />}
          color='red'
          format='percent'
        />
      </div>

      {/* Charts Row */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Volume Chart */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
              <LineChart className='w-5 h-5 text-green-600' />
              Volume Diário
            </h2>
            <span className='text-sm text-gray-500'>Últimos 5 dias</span>
          </div>
          <SimpleBarChart
            data={volumeData}
            maxValue={maxVolume}
            color='bg-gradient-to-r from-green-400 to-green-600'
          />
        </div>

        {/* Trading Distribution */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
              <PieChart className='w-5 h-5 text-blue-600' />
              Distribuição de Operações
            </h2>
          </div>
          <div className='space-y-4'>
            {/* OTC */}
            <div className='flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-blue-100 dark:bg-blue-800 rounded-lg'>
                  <TrendingUp className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                </div>
                <div>
                  <p className='font-medium text-gray-900 dark:text-white'>Trades OTC</p>
                  <p className='text-sm text-gray-500'>Compra/Venda instantânea</p>
                </div>
              </div>
              <div className='text-right'>
                <p className='text-xl font-bold text-blue-600'>
                  {new Intl.NumberFormat('pt-BR').format(analytics.trading.otc_trades)}
                </p>
              </div>
            </div>

            {/* P2P */}
            <div className='flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-green-100 dark:bg-green-800 rounded-lg'>
                  <Users className='w-5 h-5 text-green-600 dark:text-green-400' />
                </div>
                <div>
                  <p className='font-medium text-gray-900 dark:text-white'>Trades P2P</p>
                  <p className='text-sm text-gray-500'>Peer-to-Peer</p>
                </div>
              </div>
              <div className='text-right'>
                <p className='text-xl font-bold text-green-600'>
                  {new Intl.NumberFormat('pt-BR').format(analytics.trading.p2p_trades)}
                </p>
              </div>
            </div>

            {/* WolkPay */}
            {analytics.wolkpay && (
              <div className='flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-purple-100 dark:bg-purple-800 rounded-lg'>
                    <Globe className='w-5 h-5 text-purple-600 dark:text-purple-400' />
                  </div>
                  <div>
                    <p className='font-medium text-gray-900 dark:text-white'>WolkPay</p>
                    <p className='text-sm text-gray-500'>Faturas e pagamentos</p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-xl font-bold text-purple-600'>
                    {new Intl.NumberFormat('pt-BR').format(analytics.wolkpay.invoices_completed)}
                  </p>
                  <p className='text-sm text-gray-500'>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      analytics.wolkpay.volume_brl
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Boletos */}
            {analytics.bill_payment && (
              <div className='flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-amber-100 dark:bg-amber-800 rounded-lg'>
                    <Wallet className='w-5 h-5 text-amber-600 dark:text-amber-400' />
                  </div>
                  <div>
                    <p className='font-medium text-gray-900 dark:text-white'>Boletos</p>
                    <p className='text-sm text-gray-500'>Pagamentos de boleto</p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-xl font-bold text-amber-600'>
                    {new Intl.NumberFormat('pt-BR').format(analytics.bill_payment.bills_paid)}
                  </p>
                  <p className='text-sm text-gray-500'>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      analytics.bill_payment.volume_brl
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Trading Metrics */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <Zap className='w-5 h-5 text-yellow-500' />
            Métricas de Trading
          </h2>
          <div className='space-y-4'>
            <div className='flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700'>
              <span className='text-gray-600 dark:text-gray-400'>Valor Médio por Trade</span>
              <span className='font-semibold text-gray-900 dark:text-white'>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  analytics.trading.avg_trade_value
                )}
              </span>
            </div>
            <div className='flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700'>
              <span className='text-gray-600 dark:text-gray-400'>Cripto Mais Negociada</span>
              <span className='font-semibold text-green-600'>
                {analytics.trading.most_traded_crypto}
              </span>
            </div>
            <div className='flex justify-between items-center py-3'>
              <span className='text-gray-600 dark:text-gray-400'>Trades por Dia (Média)</span>
              <span className='font-semibold text-gray-900 dark:text-white'>
                {Math.round(analytics.overview.total_trades / 30)}
              </span>
            </div>
          </div>
        </div>

        {/* Growth Indicators */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <TrendingUp className='w-5 h-5 text-green-500' />
            Indicadores de Crescimento
          </h2>
          <div className='space-y-4'>
            {[
              { label: 'Usuários', value: analytics.growth.users_growth, color: 'blue' },
              { label: 'Volume', value: analytics.growth.volume_growth, color: 'green' },
              { label: 'Trades', value: analytics.growth.trades_growth, color: 'purple' },
              { label: 'Receita', value: analytics.growth.fees_growth, color: 'yellow' },
            ].map((item, index) => (
              <div key={index} className='flex items-center justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>{item.label}</span>
                <div className='flex items-center gap-2'>
                  {item.value >= 0 ? (
                    <TrendingUp className='w-4 h-4 text-green-500' />
                  ) : (
                    <TrendingDown className='w-4 h-4 text-red-500' />
                  )}
                  <span
                    className={`font-semibold ${item.value >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {item.value >= 0 ? '+' : ''}
                    {item.value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Summary */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <Calendar className='w-5 h-5 text-indigo-500' />
            Resumo Semanal
          </h2>
          <div className='space-y-3'>
            {analytics.timeframes.weekly.map((week, index) => (
              <div
                key={index}
                className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'
              >
                <div>
                  <p className='font-medium text-gray-900 dark:text-white text-sm'>{week.week}</p>
                  <p className='text-xs text-gray-500'>{week.trades} trades</p>
                </div>
                <p className='font-semibold text-green-600'>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact',
                  }).format(week.volume)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services Revenue Overview */}
      <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2'>
          <DollarSign className='w-5 h-5 text-green-500' />
          Receita por Serviço
        </h2>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <div className='text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
            <TrendingUp className='w-6 h-6 text-blue-600 mx-auto mb-2' />
            <p className='text-2xl font-bold text-blue-600'>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
              }).format(analytics.overview.total_fees_collected)}
            </p>
            <p className='text-sm text-gray-500'>OTC Taxas</p>
          </div>
          <div className='text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg'>
            <Users className='w-6 h-6 text-green-600 mx-auto mb-2' />
            <p className='text-2xl font-bold text-green-600'>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
              }).format(0)}
            </p>
            <p className='text-sm text-gray-500'>P2P Taxas</p>
          </div>
          <div className='text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg'>
            <Globe className='w-6 h-6 text-purple-600 mx-auto mb-2' />
            <p className='text-2xl font-bold text-purple-600'>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
              }).format(analytics.wolkpay?.fees_collected || 0)}
            </p>
            <p className='text-sm text-gray-500'>WolkPay Taxas</p>
          </div>
          <div className='text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg'>
            <Wallet className='w-6 h-6 text-amber-600 mx-auto mb-2' />
            <p className='text-2xl font-bold text-amber-600'>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
              }).format(analytics.bill_payment?.fees_collected || 0)}
            </p>
            <p className='text-sm text-gray-500'>Boletos Taxas</p>
          </div>
        </div>

        {/* Volume Total da Plataforma */}
        {analytics.total_platform_volume && (
          <div className='mt-6 pt-4 border-t border-gray-100 dark:border-gray-700'>
            <div className='flex items-center justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>
                Volume Total da Plataforma (todos serviços)
              </span>
              <span className='text-2xl font-bold text-green-600'>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  analytics.total_platform_volume
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
