/**
 * 🛡️ HOLD Wallet - Admin Reports Page
 * ====================================
 *
 * Página de relatórios e métricas do sistema.
 */

import React, { useEffect, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
} from 'lucide-react'

interface ReportPeriod {
  label: string
  value: string
}

interface MetricCard {
  title: string
  value: string
  change: number
  changeLabel: string
  icon: React.ReactNode
  color: string
}

interface VolumeData {
  date: string
  buy_volume: number
  sell_volume: number
}

export const AdminReportsPage: React.FC = () => {
  const [period, setPeriod] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<MetricCard[]>([])
  const [volumeData, setVolumeData] = useState<VolumeData[]>([])

  const periods: ReportPeriod[] = [
    { label: '7 dias', value: '7d' },
    { label: '30 dias', value: '30d' },
    { label: '3 meses', value: '3m' },
    { label: '12 meses', value: '12m' },
  ]

  const fetchReports = async () => {
    try {
      setLoading(true)
      // Mock data - integrar com API
      setMetrics([
        {
          title: 'Volume Total',
          value: '$1,234,567',
          change: 12.5,
          changeLabel: 'vs período anterior',
          icon: <DollarSign className='w-6 h-6' />,
          color: 'blue',
        },
        {
          title: 'Novos Usuários',
          value: '456',
          change: 8.3,
          changeLabel: 'vs período anterior',
          icon: <Users className='w-6 h-6' />,
          color: 'green',
        },
        {
          title: 'Trades Realizados',
          value: '2,345',
          change: -3.2,
          changeLabel: 'vs período anterior',
          icon: <TrendingUp className='w-6 h-6' />,
          color: 'purple',
        },
        {
          title: 'Taxa Média',
          value: '0.5%',
          change: 0,
          changeLabel: 'sem alteração',
          icon: <PieChart className='w-6 h-6' />,
          color: 'orange',
        },
      ])
      setVolumeData([
        { date: '01/01', buy_volume: 45000, sell_volume: 38000 },
        { date: '02/01', buy_volume: 52000, sell_volume: 42000 },
        { date: '03/01', buy_volume: 48000, sell_volume: 45000 },
        { date: '04/01', buy_volume: 61000, sell_volume: 55000 },
        { date: '05/01', buy_volume: 55000, sell_volume: 50000 },
        { date: '06/01', buy_volume: 68000, sell_volume: 62000 },
        { date: '07/01', buy_volume: 72000, sell_volume: 58000 },
      ])
    } catch {
      console.error('Erro ao buscar relatórios')
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

  const maxVolume = Math.max(...volumeData.flatMap(d => [d.buy_volume, d.sell_volume]))

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
      ) : (
        <>
          {/* Metrics Cards */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
            {metrics.map((metric, index) => (
              <div key={index} className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
                <div className='flex items-start justify-between mb-4'>
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${getColorClass(metric.color)}`}
                  >
                    {metric.icon}
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
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>{metric.value}</p>
                  <p className='text-xs text-gray-400 mt-1'>{metric.changeLabel}</p>
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
                {volumeData.map((day, index) => (
                  <div key={index} className='space-y-2'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-gray-500'>{day.date}</span>
                      <span className='text-gray-900 dark:text-white font-medium'>
                        ${(day.buy_volume + day.sell_volume).toLocaleString()}
                      </span>
                    </div>
                    <div className='flex gap-1 h-6'>
                      <div
                        className='bg-green-500 rounded-l'
                        style={{ width: `${(day.buy_volume / maxVolume) * 100}%` }}
                        title={`Compra: $${day.buy_volume.toLocaleString()}`}
                      />
                      <div
                        className='bg-red-500 rounded-r'
                        style={{ width: `${(day.sell_volume / maxVolume) * 100}%` }}
                        title={`Venda: $${day.sell_volume.toLocaleString()}`}
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
                      strokeDasharray='45, 100'
                    />
                    <path
                      d='M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'
                      fill='none'
                      stroke='#10b981'
                      strokeWidth='3'
                      strokeDasharray='30, 100'
                      strokeDashoffset='-45'
                    />
                    <path
                      d='M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'
                      fill='none'
                      stroke='#8b5cf6'
                      strokeWidth='3'
                      strokeDasharray='25, 100'
                      strokeDashoffset='-75'
                    />
                  </svg>
                  <div className='absolute inset-0 flex items-center justify-center flex-col'>
                    <span className='text-2xl font-bold text-gray-900 dark:text-white'>2,345</span>
                    <span className='text-sm text-gray-500'>trades</span>
                  </div>
                </div>
              </div>
              <div className='grid grid-cols-3 gap-4 mt-4'>
                <div className='text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    <div className='w-3 h-3 bg-blue-500 rounded' />
                    <span className='text-sm text-gray-500'>OTC</span>
                  </div>
                  <p className='text-lg font-semibold text-gray-900 dark:text-white'>45%</p>
                </div>
                <div className='text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    <div className='w-3 h-3 bg-green-500 rounded' />
                    <span className='text-sm text-gray-500'>P2P</span>
                  </div>
                  <p className='text-lg font-semibold text-gray-900 dark:text-white'>30%</p>
                </div>
                <div className='text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    <div className='w-3 h-3 bg-purple-500 rounded' />
                    <span className='text-sm text-gray-500'>Swap</span>
                  </div>
                  <p className='text-lg font-semibold text-gray-900 dark:text-white'>25%</p>
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
                  {[1, 2, 3, 4, 5].map(rank => (
                    <tr key={rank} className='text-sm'>
                      <td className='py-3'>
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                            rank === 1
                              ? 'bg-yellow-100 text-yellow-800'
                              : rank === 2
                                ? 'bg-gray-100 text-gray-800'
                                : rank === 3
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          {rank}
                        </span>
                      </td>
                      <td className='py-3 text-gray-900 dark:text-white'>trader_{rank}23</td>
                      <td className='py-3 text-gray-600 dark:text-gray-400'>{150 - rank * 15}</td>
                      <td className='py-3 text-gray-900 dark:text-white font-medium'>
                        ${(50000 - rank * 5000).toLocaleString()}
                      </td>
                      <td className='py-3 text-green-600'>${(250 - rank * 25).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
