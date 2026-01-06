import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DollarSign,
  TrendingUp,
  Activity,
  Wallet,
  BarChart3,
  Clock,
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
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
    <div className='p-4 space-y-4 bg-gray-900 min-h-screen'>
      {/* Header Compacto */}
      <div className='flex items-center justify-between gap-2'>
        <div>
          <h1 className='text-base font-semibold text-white flex items-center gap-2'>
            <DollarSign className='h-4 w-4 text-green-400' />
            Platform Revenue
          </h1>
        </div>
        <div className='flex items-center gap-2'>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className='bg-gray-800 border border-gray-700 text-white rounded text-xs px-2 py-1'
          >
            <option value='day'>24h</option>
            <option value='week'>7d</option>
            <option value='month'>30d</option>
            <option value='year'>1y</option>
            <option value='all'>All</option>
          </select>
          <button
            onClick={() => refetchSummary()}
            className='p-1.5 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700'
          >
            <RefreshCw className='h-4 w-4 text-gray-400' />
          </button>
        </div>
      </div>

      {/* Summary Cards - Compactos */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {/* Total Fees */}
        <div className='bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/30 rounded-lg p-3'>
          <div className='flex items-center gap-2'>
            <div className='p-2 bg-green-500/20 rounded-full'>
              <DollarSign className='h-4 w-4 text-green-400' />
            </div>
            <div>
              <p className='text-xs text-gray-400'>Total Fees</p>
              {summaryLoading ? (
                <Skeleton className='h-5 w-20' />
              ) : (
                <p className='text-base font-bold text-white'>
                  {formatUSD(summary.total_fees_brl)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className='bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/30 rounded-lg p-3'>
          <div className='flex items-center gap-2'>
            <div className='p-2 bg-blue-500/20 rounded-full'>
              <Activity className='h-4 w-4 text-blue-400' />
            </div>
            <div>
              <p className='text-xs text-gray-400'>Transactions</p>
              {summaryLoading ? (
                <Skeleton className='h-5 w-16' />
              ) : (
                <p className='text-base font-bold text-white'>{summary.total_transactions || 0}</p>
              )}
            </div>
          </div>
        </div>

        {/* Average Fee */}
        <div className='bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/30 rounded-lg p-3'>
          <div className='flex items-center gap-2'>
            <div className='p-2 bg-purple-500/20 rounded-full'>
              <TrendingUp className='h-4 w-4 text-purple-400' />
            </div>
            <div>
              <p className='text-xs text-gray-400'>Avg Fee</p>
              {summaryLoading ? (
                <Skeleton className='h-5 w-16' />
              ) : (
                <p className='text-base font-bold text-white'>{formatUSD(summary.avg_fee_brl)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Volume Processed */}
        <div className='bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700/30 rounded-lg p-3'>
          <div className='flex items-center gap-2'>
            <div className='p-2 bg-orange-500/20 rounded-full'>
              <BarChart3 className='h-4 w-4 text-orange-400' />
            </div>
            <div>
              <p className='text-xs text-gray-400'>Volume</p>
              {summaryLoading ? (
                <Skeleton className='h-5 w-20' />
              ) : (
                <p className='text-base font-bold text-white'>
                  {formatUSD(summary.total_volume_processed)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Wallet & Breakdown */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* System Wallet Balance */}
        <div className='bg-gray-800/50 border border-gray-700 rounded-lg'>
          <div className='p-3 border-b border-gray-700'>
            <h2 className='text-sm font-medium text-white flex items-center gap-2'>
              <Wallet className='h-4 w-4 text-yellow-400' />
              System Wallet
            </h2>
          </div>
          <div className='p-3'>
            {walletLoading ? (
              <div className='space-y-2'>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className='h-8 w-full' />
                ))}
              </div>
            ) : systemWallet?.balances ? (
              <div className='space-y-2'>
                {Object.entries(systemWallet.balances || {}).map(([crypto, balance]) => (
                  <div
                    key={crypto}
                    className='flex items-center justify-between p-2 bg-gray-900/50 rounded text-sm'
                  >
                    <div className='flex items-center gap-2'>
                      <div className='w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white'>
                        {crypto.slice(0, 2)}
                      </div>
                      <span className='text-white'>{crypto}</span>
                    </div>
                    <span className='font-mono text-gray-300 text-xs'>
                      {crypto === 'BRL'
                        ? formatUSD(balance as number)
                        : formatCrypto(balance as number, crypto)}
                    </span>
                  </div>
                ))}

                {/* Total Balance in USD */}
                {systemWallet.total_balance_usd !== undefined && (
                  <div className='mt-3 pt-3 border-t border-gray-700'>
                    <div className='flex justify-between items-center text-sm'>
                      <span className='text-gray-400'>Total (USD)</span>
                      <span className='font-bold text-blue-400'>
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
                  <div className='mt-3 pt-3 border-t border-gray-700 space-y-1.5 text-xs'>
                    <div className='flex justify-between'>
                      <span className='text-gray-400'>P2P (0.5%)</span>
                      <span className='text-green-400'>
                        $
                        {systemWallet.fees_collected.p2p_commission?.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-400'>OTC (3%)</span>
                      <span className='text-green-400'>
                        $
                        {systemWallet.fees_collected.otc_spread?.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-400'>Network (0.25%)</span>
                      <span className='text-green-400'>
                        $
                        {systemWallet.fees_collected.network_fee?.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className='flex justify-between pt-1.5 border-t border-gray-600 text-sm'>
                      <span className='text-white font-medium'>Total Fees</span>
                      <span className='font-bold text-green-400'>
                        $
                        {systemWallet.fees_collected.total?.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Legacy support */}
                {!systemWallet.fees_collected &&
                  systemWallet.total_fees_collected_brl !== undefined && (
                    <div className='mt-3 pt-3 border-t border-gray-700'>
                      <div className='flex justify-between items-center text-sm'>
                        <span className='text-gray-400'>Total Fees</span>
                        <span className='font-bold text-green-400'>
                          {formatUSD(systemWallet.total_fees_collected_brl)}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <p className='text-gray-400 text-center py-6 text-sm'>Wallet not found</p>
            )}
          </div>
        </div>

        {/* Fee Breakdown by Type */}
        <div className='bg-gray-800/50 border border-gray-700 rounded-lg'>
          <div className='p-3 border-b border-gray-700'>
            <h2 className='text-sm font-medium text-white flex items-center gap-2'>
              <BarChart3 className='h-4 w-4 text-blue-400' />
              Revenue by Type
            </h2>
          </div>
          <div className='p-3'>
            {summaryLoading ? (
              <div className='space-y-2'>
                {[1, 2].map(i => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : breakdown.length > 0 ? (
              <div className='space-y-2'>
                {breakdown.map((item: any) => (
                  <div key={item.fee_type} className='p-2.5 bg-gray-900/50 rounded'>
                    <div className='flex items-center justify-between'>
                      <span
                        className={`px-2 py-1 rounded text-xs border ${getFeeTypeBadge(item.fee_type)}`}
                      >
                        {getFeeTypeLabel(item.fee_type)}
                      </span>
                      <span className='text-green-400 font-bold text-sm'>
                        {formatUSD(item.total_fees)}
                      </span>
                    </div>
                    <div className='flex justify-between text-xs text-gray-400 mt-1.5'>
                      <span>{item.transaction_count} txs</span>
                      <span>{item.avg_percentage?.toFixed(2)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-gray-400 text-center py-6 text-sm'>No fees yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Daily Revenue Chart */}
      <div className='bg-gray-800/50 border border-gray-700 rounded-lg'>
        <div className='p-3 border-b border-gray-700'>
          <h2 className='text-sm font-medium text-white flex items-center gap-2'>
            <Clock className='h-4 w-4 text-purple-400' />
            Daily Revenue (30d)
          </h2>
        </div>
        <div className='p-3'>
          {revenueLoading ? (
            <Skeleton className='h-32 w-full' />
          ) : dailyRevenue.length > 0 ? (
            <div>
              {/* Simple bar chart */}
              <div className='flex items-end gap-1 h-32 overflow-x-auto'>
                {dailyRevenue.slice(-30).map((day: any, index: number) => {
                  const maxRevenue = Math.max(...dailyRevenue.map((d: any) => d.revenue)) || 1
                  const height = (day.revenue / maxRevenue) * 100
                  return (
                    <div
                      key={day.date || index}
                      className='flex-1 min-w-[6px] bg-gradient-to-t from-green-600 to-green-400 rounded-t hover:from-green-500 hover:to-green-300 cursor-pointer group relative'
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.date}: ${formatUSD(day.revenue)}`}
                    ></div>
                  )
                })}
              </div>

              {/* Summary */}
              <div className='grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-700'>
                <div className='text-center'>
                  <p className='text-gray-400 text-xs'>Revenue</p>
                  <p className='text-white font-bold text-sm'>
                    {formatUSD(revenueTotals.total_revenue)}
                  </p>
                </div>
                <div className='text-center'>
                  <p className='text-gray-400 text-xs'>Txs</p>
                  <p className='text-white font-bold text-sm'>{revenueTotals.total_transactions}</p>
                </div>
                <div className='text-center'>
                  <p className='text-gray-400 text-xs'>Volume</p>
                  <p className='text-white font-bold text-sm'>
                    {formatUSD(revenueTotals.total_volume)}
                  </p>
                </div>
                <div className='text-center'>
                  <p className='text-gray-400 text-xs'>Avg/Day</p>
                  <p className='text-white font-bold text-sm'>
                    {formatUSD(revenueTotals.avg_daily_revenue)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className='text-gray-400 text-center py-6 text-sm'>No revenue data yet</p>
          )}
        </div>
      </div>

      {/* Recent Fee History */}
      <div className='bg-gray-800/50 border border-gray-700 rounded-lg'>
        <div className='p-3 border-b border-gray-700'>
          <h2 className='text-sm font-medium text-white flex items-center gap-2'>
            <Receipt className='h-4 w-4 text-orange-400' />
            Recent Fees
          </h2>
        </div>
        <div className='p-3'>
          {historyLoading ? (
            <div className='space-y-2'>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className='h-8 w-full' />
              ))}
            </div>
          ) : feeHistory.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='border-b border-gray-700'>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Date</th>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Type</th>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Gross</th>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Fee %</th>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Fee Amount</th>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {feeHistory.map((fee: any) => (
                    <tr key={fee.id} className='border-b border-gray-800 hover:bg-gray-800/50'>
                      <td className='py-2 px-3 text-gray-300'>
                        {new Date(fee.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className='py-2 px-3'>
                        <span
                          className={`px-2 py-1 rounded-full text-xs border ${getFeeTypeBadge(fee.fee_type)}`}
                        >
                          {getFeeTypeLabel(fee.fee_type)}
                        </span>
                      </td>
                      <td className='py-2 px-3 font-mono text-gray-300'>#{fee.trade_id}</td>
                      <td className='py-2 px-3 text-gray-300'>{formatUSD(fee.gross_amount)}</td>
                      <td className='py-2 px-3 text-gray-300'>{fee.fee_percentage?.toFixed(2)}%</td>
                      <td className='py-2 px-3 text-green-400 font-medium'>
                        {formatUSD(fee.fee_amount_brl || fee.fee_amount)}
                      </td>
                      <td className='py-2 px-3'>
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
            <p className='text-gray-400 text-center py-6 text-sm'>
              No fee transactions recorded yet.
            </p>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className='flex justify-center items-center gap-2 mt-3 pt-3 border-t border-gray-700'>
              <button
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className='p-1.5 bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-700 transition-colors'
                title='Página anterior'
              >
                <ChevronLeft className='h-4 w-4 text-gray-400' />
              </button>
              <span className='px-3 py-1 text-gray-400 text-xs'>
                Page {historyPage} of {pagination.pages}
              </span>
              <button
                onClick={() => setHistoryPage(p => Math.min(pagination.pages, p + 1))}
                disabled={historyPage === pagination.pages}
                className='p-1.5 bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-700 transition-colors'
                title='Próxima página'
              >
                <ChevronRight className='h-4 w-4 text-gray-400' />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OTC Trade Commissions - Comissões dos Trades */}
      <div className='bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/30 rounded-lg'>
        <div className='p-3 border-b border-purple-700/30'>
          <h2 className='text-sm font-semibold text-white flex items-center gap-2'>
            <Calculator className='h-4 w-4 text-purple-400' />
            Comissões OTC (Instant Trades)
          </h2>
          <p className='text-xs text-gray-400 mt-1'>
            Receitas de spread e taxas de rede dos trades OTC
          </p>
        </div>

        {/* Summary Cards */}
        <div className='p-3 grid grid-cols-2 md:grid-cols-4 gap-3'>
          <div className='bg-purple-900/30 border border-purple-700/30 rounded-lg p-3'>
            <p className='text-xs text-gray-400'>Spread Total</p>
            {accountingSummaryLoading ? (
              <Skeleton className='h-5 w-20 mt-1' />
            ) : (
              <p className='text-base font-bold text-purple-400'>
                {formatUSD(accountingTotals.spread)}
              </p>
            )}
          </div>
          <div className='bg-blue-900/30 border border-blue-700/30 rounded-lg p-3'>
            <p className='text-xs text-gray-400'>Taxa de Rede</p>
            {accountingSummaryLoading ? (
              <Skeleton className='h-5 w-20 mt-1' />
            ) : (
              <p className='text-base font-bold text-blue-400'>
                {formatUSD(accountingTotals.network_fee)}
              </p>
            )}
          </div>
          <div className='bg-green-900/30 border border-green-700/30 rounded-lg p-3'>
            <p className='text-xs text-gray-400'>Total Comissões</p>
            {accountingSummaryLoading ? (
              <Skeleton className='h-5 w-20 mt-1' />
            ) : (
              <p className='text-base font-bold text-green-400'>
                {formatUSD(accountingTotals.grand_total)}
              </p>
            )}
          </div>
          <div className='bg-gray-800/50 border border-gray-700 rounded-lg p-3'>
            <p className='text-xs text-gray-400'>Trades</p>
            {accountingSummaryLoading ? (
              <Skeleton className='h-5 w-16 mt-1' />
            ) : (
              <p className='text-base font-bold text-white'>
                {accountingSummary.totals?.unique_trades || 0}
              </p>
            )}
          </div>
        </div>

        {/* Entries Table */}
        <div className='p-3'>
          {accountingLoading ? (
            <div className='space-y-2'>
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className='h-8 w-full' />
              ))}
            </div>
          ) : accountingEntries.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='border-b border-gray-700'>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Data</th>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Tipo</th>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Ref</th>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Usuário</th>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>%</th>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Valor</th>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Status</th>
                    <th className='text-left py-2 px-3 text-gray-400 font-medium'>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {accountingEntries.map((entry: any) => (
                    <tr key={entry.id} className='border-b border-gray-800 hover:bg-gray-800/50'>
                      <td className='py-2 px-3 text-gray-300'>
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className='py-2 px-3'>
                        <span
                          className={`px-2 py-1 rounded-full text-xs border ${getAccountingTypeBadge(entry.entry_type)}`}
                        >
                          {getAccountingTypeLabel(entry.entry_type)}
                        </span>
                      </td>
                      <td className='py-2 px-3 font-mono text-gray-300'>
                        {entry.reference_code || '-'}
                      </td>
                      <td className='py-2 px-3 text-gray-300'>
                        {entry.user_name || entry.user_id?.substring(0, 8) || '-'}
                      </td>
                      <td className='py-2 px-3 text-gray-300'>{entry.percentage?.toFixed(2)}%</td>
                      <td className='py-2 px-3 text-green-400 font-medium'>
                        {formatUSD(entry.amount)}
                      </td>
                      <td className='py-2 px-3'>
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
                      <td className='py-2 px-3'>
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
            <div className='text-center py-6'>
              <Receipt className='h-8 w-8 text-gray-600 mx-auto mb-3' />
              <p className='text-gray-400 text-sm'>Nenhuma comissão registrada ainda.</p>
              <p className='text-xs text-gray-500 mt-1'>
                As comissões são registradas quando um trade OTC é enviado para contabilidade.
              </p>
            </div>
          )}

          {/* Pagination */}
          {accountingPagination.pages > 1 && (
            <div className='flex justify-center items-center gap-2 mt-3 pt-3 border-t border-gray-700'>
              <button
                onClick={() => setAccountingPage(p => Math.max(1, p - 1))}
                disabled={accountingPage === 1}
                className='p-1.5 bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-700 transition-colors'
                title='Página anterior'
              >
                <ChevronLeft className='h-4 w-4 text-gray-400' />
              </button>
              <span className='px-3 py-1 text-gray-400 text-xs'>
                Página {accountingPage} de {accountingPagination.pages}
              </span>
              <button
                onClick={() => setAccountingPage(p => Math.min(accountingPagination.pages, p + 1))}
                disabled={accountingPage === accountingPagination.pages}
                className='p-1.5 bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-700 transition-colors'
                title='Próxima página'
              >
                <ChevronRight className='h-4 w-4 text-gray-400' />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
