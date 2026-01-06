import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DollarSign,
  TrendingUp,
  Activity,
  Wallet,
  BarChart3,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Receipt,
  Calculator,
  ExternalLink,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Helper para obter token
const getAuthToken = () => {
  try {
    const stored = localStorage.getItem('hold-wallet-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.token
    }
  } catch {
    return null
  }
  return null
}

// Fetch helper com auth
const authFetch = async (endpoint: string) => {
  const token = getAuthToken()
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

// API functions
const fetchFeeSummary = async (period: string) => {
  return authFetch(`/admin/fees/summary?period=${period}`)
}

const fetchFeeHistory = async (page: number) => {
  return authFetch(`/admin/fees/history?page=${page}&limit=10`)
}

const fetchDailyRevenue = async (days: number) => {
  return authFetch(`/admin/fees/daily-revenue?days=${days}`)
}

const fetchSystemWallet = async () => {
  return authFetch('/admin/fees/system-wallet')
}

const fetchAccountingEntries = async (page: number) => {
  return authFetch(`/admin/fees/accounting-entries?page=${page}&limit=10`)
}

const fetchAccountingSummary = async (period: string) => {
  return authFetch(`/admin/fees/accounting-summary?period=${period}`)
}

export default function AdminFeesPage() {
  const [period, setPeriod] = React.useState('month')
  const [historyPage, setHistoryPage] = React.useState(1)
  const [accountingPage, setAccountingPage] = React.useState(1)

  // Queries
  const {
    data: summaryData,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['admin-fee-summary', period],
    queryFn: () => fetchFeeSummary(period),
    staleTime: 60000,
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['admin-fee-history', historyPage],
    queryFn: () => fetchFeeHistory(historyPage),
    staleTime: 60000,
  })

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['admin-daily-revenue'],
    queryFn: () => fetchDailyRevenue(30),
    staleTime: 300000,
  })

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['admin-system-wallet'],
    queryFn: fetchSystemWallet,
    staleTime: 60000,
  })

  // Queries para comissões OTC (accounting_entries)
  const { data: accountingData, isLoading: accountingLoading } = useQuery({
    queryKey: ['admin-accounting-entries', accountingPage],
    queryFn: () => fetchAccountingEntries(accountingPage),
    staleTime: 60000,
  })

  const { data: accountingSummaryData, isLoading: accountingSummaryLoading } = useQuery({
    queryKey: ['admin-accounting-summary', period],
    queryFn: () => fetchAccountingSummary(period),
    staleTime: 60000,
  })

  const summary = summaryData?.data?.summary || {}
  const breakdown = summaryData?.data?.breakdown_by_type || []
  const systemWallet = walletData?.data || null
  const feeHistory = historyData?.data || []
  const dailyRevenue = revenueData?.data?.daily_data || []
  const revenueTotals = revenueData?.data?.totals || {}
  const pagination = historyData?.pagination || { page: 1, pages: 1, total: 0 }

  // Dados das comissões OTC
  const accountingEntries = accountingData?.data || []
  const accountingTotals = accountingData?.totals || {
    spread: 0,
    network_fee: 0,
    platform_fee: 0,
    grand_total: 0,
  }
  const accountingPagination = accountingData?.pagination || { page: 1, pages: 1, total: 0 }
  const accountingSummary = accountingSummaryData?.data || {
    breakdown: [],
    totals: { grand_total: 0, total_entries: 0, unique_trades: 0 },
  }

  // Format currency
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0)
  }

  const formatCrypto = (value: number, crypto: string) => {
    return `${value?.toFixed(8) || '0.00000000'} ${crypto}`
  }

  // Get fee type badge
  const getFeeTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      p2p_commission: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      otc_spread: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      network_fee: 'bg-green-500/20 text-green-400 border-green-500/30',
      withdrawal_fee: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    }
    return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const getFeeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      p2p_commission: 'P2P Commission',
      otc_spread: 'OTC Spread',
      network_fee: 'Network Fee',
      withdrawal_fee: 'Withdrawal',
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    if (status === 'collected') return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (status === 'pending') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  // Helpers para accounting entries
  const getAccountingTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      spread: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      network_fee: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      platform_fee: 'bg-green-500/20 text-green-400 border-green-500/30',
    }
    return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const getAccountingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      spread: 'Spread',
      network_fee: 'Taxa de Rede',
      platform_fee: 'Total Plataforma',
    }
    return labels[type] || type
  }

  const getAccountingStatusBadge = (status: string) => {
    if (status === 'processed') return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (status === 'pending') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    if (status === 'sent_to_erp') return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  // Loading skeleton
  const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-700 rounded ${className}`}></div>
  )

  return (
    <div className='p-6 space-y-6 bg-gray-900 min-h-screen'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-white flex items-center gap-2'>
            💰 Platform Revenue
          </h1>
          <p className='text-gray-400'>Fee collection and revenue analytics</p>
        </div>
        <div className='flex items-center gap-3'>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className='bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          >
            <option value='day'>Last 24 Hours</option>
            <option value='week'>Last 7 Days</option>
            <option value='month'>Last 30 Days</option>
            <option value='year'>Last Year</option>
            <option value='all'>All Time</option>
          </select>
          <button
            onClick={() => refetchSummary()}
            className='p-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors'
          >
            <RefreshCw className='h-5 w-5 text-gray-400' />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Total Fees */}
        <div className='bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/30 rounded-xl p-6'>
          <div className='flex items-center gap-4'>
            <div className='p-3 bg-green-500/20 rounded-full'>
              <DollarSign className='h-6 w-6 text-green-400' />
            </div>
            <div>
              <p className='text-sm text-gray-400'>Total Fees Collected</p>
              {summaryLoading ? (
                <Skeleton className='h-8 w-32' />
              ) : (
                <p className='text-2xl font-bold text-white'>{formatBRL(summary.total_fees_brl)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className='bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/30 rounded-xl p-6'>
          <div className='flex items-center gap-4'>
            <div className='p-3 bg-blue-500/20 rounded-full'>
              <Activity className='h-6 w-6 text-blue-400' />
            </div>
            <div>
              <p className='text-sm text-gray-400'>Fee Transactions</p>
              {summaryLoading ? (
                <Skeleton className='h-8 w-20' />
              ) : (
                <p className='text-2xl font-bold text-white'>{summary.total_transactions || 0}</p>
              )}
            </div>
          </div>
        </div>

        {/* Average Fee */}
        <div className='bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/30 rounded-xl p-6'>
          <div className='flex items-center gap-4'>
            <div className='p-3 bg-purple-500/20 rounded-full'>
              <TrendingUp className='h-6 w-6 text-purple-400' />
            </div>
            <div>
              <p className='text-sm text-gray-400'>Average Fee</p>
              {summaryLoading ? (
                <Skeleton className='h-8 w-24' />
              ) : (
                <p className='text-2xl font-bold text-white'>{formatBRL(summary.avg_fee_brl)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Volume Processed */}
        <div className='bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700/30 rounded-xl p-6'>
          <div className='flex items-center gap-4'>
            <div className='p-3 bg-orange-500/20 rounded-full'>
              <BarChart3 className='h-6 w-6 text-orange-400' />
            </div>
            <div>
              <p className='text-sm text-gray-400'>Volume Processed</p>
              {summaryLoading ? (
                <Skeleton className='h-8 w-32' />
              ) : (
                <p className='text-2xl font-bold text-white'>
                  {formatBRL(summary.total_volume_processed)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Wallet & Breakdown */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* System Wallet Balance */}
        <div className='bg-gray-800/50 border border-gray-700 rounded-xl'>
          <div className='p-4 border-b border-gray-700'>
            <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
              <Wallet className='h-5 w-5 text-yellow-400' />
              System Wallet Balance
            </h2>
          </div>
          <div className='p-4'>
            {walletLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className='h-12 w-full' />
                ))}
              </div>
            ) : systemWallet?.balances ? (
              <div className='space-y-3'>
                {Object.entries(systemWallet.balances || {}).map(([crypto, balance]) => (
                  <div
                    key={crypto}
                    className='flex items-center justify-between p-3 bg-gray-900/50 rounded-lg'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white'>
                        {crypto.slice(0, 2)}
                      </div>
                      <span className='font-medium text-white'>{crypto}</span>
                    </div>
                    <span className='font-mono text-gray-300'>
                      {crypto === 'BRL'
                        ? formatBRL(balance as number)
                        : formatCrypto(balance as number, crypto)}
                    </span>
                  </div>
                ))}

                {/* Total Balance in USD */}
                {systemWallet.total_balance_usd !== undefined && (
                  <div className='mt-4 pt-4 border-t border-gray-700'>
                    <div className='flex justify-between items-center'>
                      <span className='text-gray-400'>Total Balance (USD)</span>
                      <span className='text-xl font-bold text-blue-400'>
                        $
                        {systemWallet.total_balance_usd?.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Fees Collected Summary */}
                {systemWallet.fees_collected && (
                  <div className='mt-4 pt-4 border-t border-gray-700 space-y-2'>
                    <div className='flex justify-between items-center'>
                      <span className='text-gray-400'>P2P Commission (0.5%)</span>
                      <span className='font-mono text-green-400'>
                        $
                        {systemWallet.fees_collected.p2p_commission?.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className='flex justify-between items-center'>
                      <span className='text-gray-400'>OTC Spread (3%)</span>
                      <span className='font-mono text-green-400'>
                        $
                        {systemWallet.fees_collected.otc_spread?.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className='flex justify-between items-center'>
                      <span className='text-gray-400'>Network Fees (0.25%)</span>
                      <span className='font-mono text-green-400'>
                        $
                        {systemWallet.fees_collected.network_fee?.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className='flex justify-between items-center pt-2 border-t border-gray-600'>
                      <span className='text-white font-semibold'>Total Fees Collected</span>
                      <span className='text-xl font-bold text-green-400'>
                        $
                        {systemWallet.fees_collected.total?.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Legacy total_fees_collected_brl support */}
                {!systemWallet.fees_collected &&
                  systemWallet.total_fees_collected_brl !== undefined && (
                    <div className='mt-4 pt-4 border-t border-gray-700'>
                      <div className='flex justify-between items-center'>
                        <span className='text-gray-400'>Total Fees Collected (All Time)</span>
                        <span className='text-xl font-bold text-green-400'>
                          {formatBRL(systemWallet.total_fees_collected_brl)}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <p className='text-gray-400 text-center py-8'>
                System wallet not found. Run migrations to create it.
              </p>
            )}
          </div>
        </div>

        {/* Fee Breakdown by Type */}
        <div className='bg-gray-800/50 border border-gray-700 rounded-xl'>
          <div className='p-4 border-b border-gray-700'>
            <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
              <BarChart3 className='h-5 w-5 text-blue-400' />
              Revenue by Fee Type
            </h2>
          </div>
          <div className='p-4'>
            {summaryLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : breakdown.length > 0 ? (
              <div className='space-y-3'>
                {breakdown.map((item: any) => (
                  <div key={item.fee_type} className='p-4 bg-gray-900/50 rounded-lg'>
                    <div className='flex items-center justify-between mb-2'>
                      <span
                        className={`px-3 py-1 rounded-full text-sm border ${getFeeTypeBadge(item.fee_type)}`}
                      >
                        {getFeeTypeLabel(item.fee_type)}
                      </span>
                      <span className='text-green-400 font-bold'>{formatBRL(item.total_fees)}</span>
                    </div>
                    <div className='flex justify-between text-sm text-gray-400'>
                      <span>{item.transaction_count} transactions</span>
                      <span>{item.avg_percentage?.toFixed(2)}% avg rate</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-gray-400 text-center py-8'>
                No fees collected yet in this period.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Daily Revenue Chart */}
      <div className='bg-gray-800/50 border border-gray-700 rounded-xl'>
        <div className='p-4 border-b border-gray-700'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
            <Clock className='h-5 w-5 text-purple-400' />
            Daily Revenue (Last 30 Days)
          </h2>
        </div>
        <div className='p-4'>
          {revenueLoading ? (
            <Skeleton className='h-48 w-full' />
          ) : dailyRevenue.length > 0 ? (
            <div>
              {/* Simple bar chart */}
              <div className='flex items-end gap-1 h-48 overflow-x-auto pb-4'>
                {dailyRevenue.slice(-30).map((day: any, index: number) => {
                  const maxRevenue = Math.max(...dailyRevenue.map((d: any) => d.revenue)) || 1
                  const height = (day.revenue / maxRevenue) * 100
                  return (
                    <div
                      key={day.date || index}
                      className='flex-1 min-w-[10px] bg-gradient-to-t from-green-600 to-green-400 rounded-t hover:from-green-500 hover:to-green-300 transition-all cursor-pointer group relative'
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.date}: ${formatBRL(day.revenue)}`}
                    >
                      <div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none'>
                        {day.date}
                        <br />
                        {formatBRL(day.revenue)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary */}
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700'>
                <div className='text-center'>
                  <p className='text-gray-400 text-sm'>Total Revenue</p>
                  <p className='text-white font-bold'>{formatBRL(revenueTotals.total_revenue)}</p>
                </div>
                <div className='text-center'>
                  <p className='text-gray-400 text-sm'>Total Transactions</p>
                  <p className='text-white font-bold'>{revenueTotals.total_transactions}</p>
                </div>
                <div className='text-center'>
                  <p className='text-gray-400 text-sm'>Total Volume</p>
                  <p className='text-white font-bold'>{formatBRL(revenueTotals.total_volume)}</p>
                </div>
                <div className='text-center'>
                  <p className='text-gray-400 text-sm'>Avg Daily</p>
                  <p className='text-white font-bold'>
                    {formatBRL(revenueTotals.avg_daily_revenue)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className='text-gray-400 text-center py-8'>No revenue data available yet.</p>
          )}
        </div>
      </div>

      {/* Recent Fee History */}
      <div className='bg-gray-800/50 border border-gray-700 rounded-xl'>
        <div className='p-4 border-b border-gray-700'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
            <Users className='h-5 w-5 text-orange-400' />
            Recent Fee Transactions
          </h2>
        </div>
        <div className='p-4'>
          {historyLoading ? (
            <div className='space-y-3'>
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className='h-12 w-full' />
              ))}
            </div>
          ) : feeHistory.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-700'>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Date</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Type</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Trade ID</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Gross Amount</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Fee %</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Fee Amount</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {feeHistory.map((fee: any) => (
                    <tr key={fee.id} className='border-b border-gray-800 hover:bg-gray-800/50'>
                      <td className='py-3 px-4 text-gray-300'>
                        {new Date(fee.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className='py-3 px-4'>
                        <span
                          className={`px-2 py-1 rounded-full text-xs border ${getFeeTypeBadge(fee.fee_type)}`}
                        >
                          {getFeeTypeLabel(fee.fee_type)}
                        </span>
                      </td>
                      <td className='py-3 px-4 font-mono text-gray-300'>#{fee.trade_id}</td>
                      <td className='py-3 px-4 text-gray-300'>{formatBRL(fee.gross_amount)}</td>
                      <td className='py-3 px-4 text-gray-300'>{fee.fee_percentage?.toFixed(2)}%</td>
                      <td className='py-3 px-4 text-green-400 font-medium'>
                        {formatBRL(fee.fee_amount_brl || fee.fee_amount)}
                      </td>
                      <td className='py-3 px-4'>
                        <span
                          className={`px-2 py-1 rounded-full text-xs border ${getStatusBadge(fee.status)}`}
                        >
                          {fee.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className='text-gray-400 text-center py-8'>No fee transactions recorded yet.</p>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className='flex justify-center items-center gap-2 mt-4 pt-4 border-t border-gray-700'>
              <button
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className='p-2 bg-gray-800 rounded-lg disabled:opacity-50 hover:bg-gray-700 transition-colors'
                title='Página anterior'
              >
                <ChevronLeft className='h-5 w-5 text-gray-400' />
              </button>
              <span className='px-4 py-2 text-gray-400'>
                Page {historyPage} of {pagination.pages}
              </span>
              <button
                onClick={() => setHistoryPage(p => Math.min(pagination.pages, p + 1))}
                disabled={historyPage === pagination.pages}
                className='p-2 bg-gray-800 rounded-lg disabled:opacity-50 hover:bg-gray-700 transition-colors'
                title='Próxima página'
              >
                <ChevronRight className='h-5 w-5 text-gray-400' />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OTC Trade Commissions - Comissões dos Trades */}
      <div className='bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/30 rounded-xl'>
        <div className='p-4 border-b border-purple-700/30'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
            <Calculator className='h-5 w-5 text-purple-400' />
            Comissões OTC (Instant Trades)
          </h2>
          <p className='text-sm text-gray-400 mt-1'>
            Receitas de spread e taxas de rede dos trades OTC
          </p>
        </div>

        {/* Summary Cards */}
        <div className='p-4 grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='bg-purple-900/30 border border-purple-700/30 rounded-lg p-4'>
            <p className='text-sm text-gray-400'>Spread Total</p>
            {accountingSummaryLoading ? (
              <Skeleton className='h-8 w-24 mt-1' />
            ) : (
              <p className='text-xl font-bold text-purple-400'>
                {formatBRL(accountingTotals.spread)}
              </p>
            )}
          </div>
          <div className='bg-blue-900/30 border border-blue-700/30 rounded-lg p-4'>
            <p className='text-sm text-gray-400'>Taxa de Rede Total</p>
            {accountingSummaryLoading ? (
              <Skeleton className='h-8 w-24 mt-1' />
            ) : (
              <p className='text-xl font-bold text-blue-400'>
                {formatBRL(accountingTotals.network_fee)}
              </p>
            )}
          </div>
          <div className='bg-green-900/30 border border-green-700/30 rounded-lg p-4'>
            <p className='text-sm text-gray-400'>Total de Comissões</p>
            {accountingSummaryLoading ? (
              <Skeleton className='h-8 w-24 mt-1' />
            ) : (
              <p className='text-xl font-bold text-green-400'>
                {formatBRL(accountingTotals.grand_total)}
              </p>
            )}
          </div>
          <div className='bg-gray-800/50 border border-gray-700 rounded-lg p-4'>
            <p className='text-sm text-gray-400'>Trades Contabilizados</p>
            {accountingSummaryLoading ? (
              <Skeleton className='h-8 w-16 mt-1' />
            ) : (
              <p className='text-xl font-bold text-white'>
                {accountingSummary.totals?.unique_trades || 0}
              </p>
            )}
          </div>
        </div>

        {/* Entries Table */}
        <div className='p-4'>
          {accountingLoading ? (
            <div className='space-y-3'>
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className='h-12 w-full' />
              ))}
            </div>
          ) : accountingEntries.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-700'>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Data</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Tipo</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Referência</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Usuário</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>%</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Valor</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Status</th>
                    <th className='text-left py-3 px-4 text-gray-400 font-medium'>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {accountingEntries.map((entry: any) => (
                    <tr key={entry.id} className='border-b border-gray-800 hover:bg-gray-800/50'>
                      <td className='py-3 px-4 text-gray-300'>
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className='py-3 px-4'>
                        <span
                          className={`px-2 py-1 rounded-full text-xs border ${getAccountingTypeBadge(entry.entry_type)}`}
                        >
                          {getAccountingTypeLabel(entry.entry_type)}
                        </span>
                      </td>
                      <td className='py-3 px-4 font-mono text-gray-300'>
                        {entry.reference_code || '-'}
                      </td>
                      <td className='py-3 px-4 text-gray-300'>
                        {entry.user_name || entry.user_id?.substring(0, 8) || '-'}
                      </td>
                      <td className='py-3 px-4 text-gray-300'>{entry.percentage?.toFixed(2)}%</td>
                      <td className='py-3 px-4 text-green-400 font-medium'>
                        {formatBRL(entry.amount)}
                      </td>
                      <td className='py-3 px-4'>
                        <span
                          className={`px-2 py-1 rounded-full text-xs border ${getAccountingStatusBadge(entry.status)}`}
                        >
                          {entry.status === 'processed'
                            ? 'Processado'
                            : entry.status === 'pending'
                              ? 'Pendente'
                              : entry.status}
                        </span>
                      </td>
                      <td className='py-3 px-4'>
                        {entry.trade_id && (
                          <a
                            href={`/admin/trades/${entry.trade_id}`}
                            className='text-blue-400 hover:text-blue-300 flex items-center gap-1'
                            title='Ver trade'
                          >
                            <ExternalLink className='h-4 w-4' />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='text-center py-8'>
              <Receipt className='h-12 w-12 text-gray-600 mx-auto mb-4' />
              <p className='text-gray-400'>Nenhuma comissão registrada ainda.</p>
              <p className='text-sm text-gray-500 mt-2'>
                As comissões são registradas quando um trade OTC é enviado para contabilidade.
              </p>
            </div>
          )}

          {/* Pagination */}
          {accountingPagination.pages > 1 && (
            <div className='flex justify-center items-center gap-2 mt-4 pt-4 border-t border-gray-700'>
              <button
                onClick={() => setAccountingPage(p => Math.max(1, p - 1))}
                disabled={accountingPage === 1}
                className='p-2 bg-gray-800 rounded-lg disabled:opacity-50 hover:bg-gray-700 transition-colors'
                title='Página anterior'
              >
                <ChevronLeft className='h-5 w-5 text-gray-400' />
              </button>
              <span className='px-4 py-2 text-gray-400'>
                Página {accountingPage} de {accountingPagination.pages}
              </span>
              <button
                onClick={() => setAccountingPage(p => Math.min(accountingPagination.pages, p + 1))}
                disabled={accountingPage === accountingPagination.pages}
                className='p-2 bg-gray-800 rounded-lg disabled:opacity-50 hover:bg-gray-700 transition-colors'
                title='Próxima página'
              >
                <ChevronRight className='h-5 w-5 text-gray-400' />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
