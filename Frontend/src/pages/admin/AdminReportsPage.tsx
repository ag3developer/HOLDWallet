/**
 * 🛡️ HOLD Wallet - Admin Reports Page
 * ====================================
 *
 * Página de relatórios e métricas do sistema com dados reais.
 */

import React, { useEffect, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  AlertCircle,
} from 'lucide-react'
import { apiClient } from '../../services/api'

interface ReportPeriod {
  label: string
  value: string
}

interface MetricCard {
  title: string
  value: number
  formatted_value: string
  change: number
  change_label: string
  color: string
}

interface VolumeData {
  date: string
  buy_volume: number
  sell_volume: number
}

interface TopTrader {
  rank: number
  user_id: string
  email: string
  trades_count: number
  total_volume: number
  fee_paid: number
}

interface ReportsData {
  metrics: MetricCard[]
  volume_data: VolumeData[]
  distribution: {
    total_trades: number
    otc: { count: number; percent: number }
    p2p: { count: number; percent: number }
  }
  top_traders: TopTrader[]
  period: string
  generated_at: string
}

export const AdminReportsPage: React.FC = () => {
  const [period, setPeriod] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReportsData | null>(null)

  const periods: ReportPeriod[] = [
    { label: '7 dias', value: '7d' },
    { label: '30 dias', value: '30d' },
    { label: '3 meses', value: '3m' },
    { label: '12 meses', value: '12m' },
  ]

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient.get(`/admin/reports/dashboard?period=${period}`)

      if (response.data?.success && response.data?.data) {
        setData(response.data.data)
      } else {
        throw new Error('Dados inválidos recebidos')
      }
    } catch (err: any) {
      console.error('Erro ao buscar relatórios:', err)
      setError(err.response?.data?.message || 'Erro ao carregar relatórios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [period])

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600',
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
    }
    return colors[color] || colors.blue
  }

  const getIcon = (color: string) => {
    const icons: Record<string, React.ReactNode> = {
      blue: <DollarSign className='w-6 h-6' />,
      green: <Users className='w-6 h-6' />,
      purple: <TrendingUp className='w-6 h-6' />,
      orange: <PieChart className='w-6 h-6' />,
    }
    return icons[color] || icons.blue
  }

  const maxVolume = data?.volume_data
    ? Math.max(...data.volume_data.flatMap(d => [d.buy_volume, d.sell_volume]), 1)
    : 1

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-6'>
      {/* Header */}
      <div className='flex items-start justify-between mb-8'>
        <div>
          <div className='flex items-center gap-3 mb-2'>
            <BarChart3 className='w-8 h-8 text-indigo-600' />
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
              Relatórios & Métricas
            </h1>
          </div>
          <p className='text-gray-600 dark:text-gray-400'>
            Análise de performance e indicadores do sistema
          </p>
        </div>
        <div className='flex items-center gap-4'>
          <button
            onClick={fetchReports}
            className='p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600'
            title='Atualizar dados'
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
          <button className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2'>
            <Download className='w-4 h-4' />
            Exportar
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className='flex gap-2 mb-6'>
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className='flex items-center gap-2'>
              <Calendar className='w-4 h-4' />
              {p.label}
            </div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-20'>
          <RefreshCw className='w-8 h-8 animate-spin text-indigo-500' />
        </div>
      ) : error ? (
        <div className='flex flex-col items-center justify-center py-20'>
          <AlertCircle className='w-12 h-12 text-red-500 mb-4' />
          <p className='text-red-500'>{error}</p>
          <button
            onClick={fetchReports}
            className='mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700'
          >
            Tentar novamente
          </button>
        </div>
      ) : data ? (
        <>
          {/* Metrics Cards */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
            {data.metrics.map(metric => (
              <div
                key={metric.title}
                className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'
              >
                <div className='flex items-start justify-between mb-4'>
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${getColorClass(metric.color)}`}
                  >
                    {getIcon(metric.color)}
                  </div>
                  {metric.change !== 0 && (
                    <div
                      className={`flex items-center gap-1 text-sm ${metric.change > 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {metric.change > 0 ? (
                        <ArrowUpRight className='w-4 h-4' />
                      ) : (
                        <ArrowDownRight className='w-4 h-4' />
                      )}
                      {Math.abs(metric.change)}%
                    </div>
                  )}
                </div>
                <div>
                  <h3 className='text-sm text-gray-500 dark:text-gray-400'>{metric.title}</h3>
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {metric.formatted_value}
                  </p>
                  <p className='text-xs text-gray-400 mt-1'>{metric.change_label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
            {/* Volume Chart */}
            <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-6'>
                Volume de Trading
              </h3>
              <div className='space-y-4'>
                {data.volume_data.map(day => (
                  <div key={day.date} className='space-y-2'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-gray-500'>{day.date}</span>
                      <span className='text-gray-900 dark:text-white font-medium'>
                        R${' '}
                        {(day.buy_volume + day.sell_volume).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className='flex gap-1 h-6'>
                      <div
                        className='bg-green-500 rounded-l'
                        style={{ width: `${(day.buy_volume / maxVolume) * 100}%` }}
                        title={`Compra: R$ ${day.buy_volume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      />
                      <div
                        className='bg-red-500 rounded-r'
                        style={{ width: `${(day.sell_volume / maxVolume) * 100}%` }}
                        title={`Venda: R$ ${day.sell_volume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className='flex items-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700'>
                <div className='flex items-center gap-2'>
                  <div className='w-3 h-3 bg-green-500 rounded' />
                  <span className='text-sm text-gray-500'>Compra</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-3 h-3 bg-red-500 rounded' />
                  <span className='text-sm text-gray-500'>Venda</span>
                </div>
              </div>
            </div>

            {/* Distribution Chart */}
            <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-6'>
                Distribuição por Tipo
              </h3>
              <div className='flex items-center justify-center py-8'>
                <div className='relative w-48 h-48'>
                  <svg viewBox='0 0 36 36' className='w-full h-full -rotate-90'>
                    <path
                      d='M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'
                      fill='none'
                      stroke='#e5e7eb'
                      strokeWidth='3'
                    />
                    <path
                      d='M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'
                      fill='none'
                      stroke='#3b82f6'
                      strokeWidth='3'
                      strokeDasharray={`${data.distribution.otc.percent}, 100`}
                    />
                    <path
                      d='M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'
                      fill='none'
                      stroke='#10b981'
                      strokeWidth='3'
                      strokeDasharray={`${data.distribution.p2p.percent}, 100`}
                      strokeDashoffset={`-${data.distribution.otc.percent}`}
                    />
                  </svg>
                  <div className='absolute inset-0 flex items-center justify-center flex-col'>
                    <span className='text-2xl font-bold text-gray-900 dark:text-white'>
                      {data.distribution.total_trades.toLocaleString()}
                    </span>
                    <span className='text-sm text-gray-500'>trades</span>
                  </div>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4 mt-4'>
                <div className='text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    <div className='w-3 h-3 bg-blue-500 rounded' />
                    <span className='text-sm text-gray-500'>OTC</span>
                  </div>
                  <p className='text-lg font-semibold text-gray-900 dark:text-white'>
                    {data.distribution.otc.percent}%
                  </p>
                  <p className='text-xs text-gray-400'>{data.distribution.otc.count} trades</p>
                </div>
                <div className='text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    <div className='w-3 h-3 bg-green-500 rounded' />
                    <span className='text-sm text-gray-500'>P2P</span>
                  </div>
                  <p className='text-lg font-semibold text-gray-900 dark:text-white'>
                    {data.distribution.p2p.percent}%
                  </p>
                  <p className='text-xs text-gray-400'>{data.distribution.p2p.count} trades</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Users Table */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-6'>
              Top Traders do Período
            </h3>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='text-left text-sm text-gray-500 border-b border-gray-200 dark:border-gray-700'>
                    <th className='pb-3 font-medium'>Rank</th>
                    <th className='pb-3 font-medium'>Usuário</th>
                    <th className='pb-3 font-medium'>Trades</th>
                    <th className='pb-3 font-medium'>Volume</th>
                    <th className='pb-3 font-medium'>Taxa Paga</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-700'>
                  {data.top_traders.length > 0 ? (
                    data.top_traders.map(trader => (
                      <tr key={trader.user_id} className='text-sm'>
                        <td className='py-3'>
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                              trader.rank === 1
                                ? 'bg-yellow-100 text-yellow-800'
                                : trader.rank === 2
                                  ? 'bg-gray-100 text-gray-800'
                                  : trader.rank === 3
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            {trader.rank}
                          </span>
                        </td>
                        <td className='py-3 text-gray-900 dark:text-white'>{trader.email}</td>
                        <td className='py-3 text-gray-600 dark:text-gray-400'>
                          {trader.trades_count}
                        </td>
                        <td className='py-3 text-gray-900 dark:text-white font-medium'>
                          R${' '}
                          {trader.total_volume.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className='py-3 text-green-600'>
                          R$ {trader.fee_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className='py-8 text-center text-gray-500'>
                        Nenhum trader encontrado no período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
