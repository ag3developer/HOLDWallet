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
            title='Período'
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
            title='Atualizar'
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
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-3'>
        {/* System Wallet Balance - Compacto */}
        <div className='lg:col-span-2 bg-gray-800/50 border border-gray-700 rounded-lg'>
          <div className='p-2 border-b border-gray-700 flex items-center justify-between'>
            <h2 className='text-xs font-medium text-white flex items-center gap-1.5'>
              <Wallet className='h-3.5 w-3.5 text-yellow-400' />
              System Wallet
            </h2>
            {systemWallet?.total_stables > 0 && (
              <span className='text-xs text-green-400 font-medium'>
                Stables: ${systemWallet.total_stables?.toFixed(2)}
              </span>
            )}
          </div>
          <div className='p-2'>
            {walletLoading ? (
              <div className='grid grid-cols-4 gap-1.5'>
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className='h-8' />
                ))}
              </div>
            ) : systemWallet?.balances ? (
              <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5'>
                {Object.entries(systemWallet.balances || {})
                  .filter(([_, balance]) => (balance as number) > 0)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([crypto, balance]) => {
                    const logoMap: Record<string, string> = {
                      USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
                      USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
                      POLYGON: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
                      ETHEREUM: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
                      BSC: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
                      BITCOIN: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
                      SOLANA: 'https://cryptologos.cc/logos/solana-sol-logo.png',
                    }
                    return (
                      <div
                        key={crypto}
                        className='flex items-center gap-1.5 p-1.5 bg-gray-900/50 rounded border border-gray-700/50'
                      >
                        {logoMap[crypto] ? (
                          <img src={logoMap[crypto]} alt={crypto} className='w-4 h-4' />
                        ) : (
                          <div className='w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center text-[8px] font-bold'>
                            {crypto.slice(0, 2)}
                          </div>
                        )}
                        <div className='flex flex-col'>
                          <span className='text-[10px] text-gray-400'>{crypto}</span>
                          <span className='text-xs font-medium text-white'>
                            {crypto.includes('USD') ? '$' : ''}
                            {(balance as number).toFixed(crypto.includes('USD') ? 2 : 4)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                {Object.values(systemWallet.balances || {}).every(b => (b as number) === 0) && (
                  <p className='col-span-full text-gray-500 text-xs text-center py-2'>
                    Sem saldos ainda
                  </p>
                )}
              </div>
            ) : (
              <p className='text-gray-400 text-center py-3 text-xs'>Wallet not found</p>
            )}
          </div>
        </div>

        {/* Fee Breakdown by Type - Compacto */}
        <div className='bg-gray-800/50 border border-gray-700 rounded-lg'>
          <div className='p-2 border-b border-gray-700'>
            <h2 className='text-xs font-medium text-white flex items-center gap-1.5'>
              <BarChart3 className='h-3.5 w-3.5 text-blue-400' />
              Revenue by Type
            </h2>
          </div>
          <div className='p-2'>
            {summaryLoading ? (
              <div className='space-y-1.5'>
                {[1, 2].map(i => (
                  <Skeleton key={i} className='h-8' />
                ))}
              </div>
            ) : breakdown.length > 0 ? (
              <div className='space-y-1.5'>
                {breakdown.map((item: any) => (
                  <div
                    key={item.fee_type}
                    className='flex items-center justify-between p-2 bg-gray-900/50 rounded'
                  >
                    <div className='flex items-center gap-2'>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${getFeeTypeBadge(item.fee_type)}`}
                      >
                        {getFeeTypeLabel(item.fee_type)}
                      </span>
                      <span className='text-[10px] text-gray-500'>
                        {item.transaction_count} txs
                      </span>
                    </div>
                    <div className='text-right'>
                      <span className='text-green-400 font-bold text-xs'>
                        {formatUSD(item.total_fees)}
                      </span>
                      <span className='text-[10px] text-gray-500 ml-1.5'>
                        {item.avg_percentage?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-gray-400 text-center py-3 text-xs'>No fees yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Daily Revenue Chart - Mais compacto */}
      <div className='bg-gray-800/50 border border-gray-700 rounded-lg'>
        <div className='p-2 border-b border-gray-700'>
          <h2 className='text-xs font-medium text-white flex items-center gap-1.5'>
            <Clock className='h-3.5 w-3.5 text-purple-400' />
            Daily Revenue (30d)
          </h2>
        </div>
        <div className='p-2'>
          {revenueLoading ? (
            <Skeleton className='h-20 w-full' />
          ) : dailyRevenue.length > 0 ? (
            <div>
              {/* Simple bar chart */}
              <div className='flex items-end gap-0.5 h-20 overflow-x-auto'>
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
                  <p className='text-gray-400 text-[10px]'>Avg/Day</p>
                  <p className='text-white font-bold text-xs'>
                    {formatUSD(revenueTotals.avg_daily_revenue)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className='text-gray-400 text-center py-3 text-xs'>No revenue data yet</p>
          )}
        </div>
      </div>

      {/* Recent Fee History - Compacto */}
      <div className='bg-gray-800/50 border border-gray-700 rounded-lg'>
        <div className='p-2 border-b border-gray-700'>
          <h2 className='text-xs font-medium text-white flex items-center gap-1.5'>
            <Receipt className='h-3.5 w-3.5 text-orange-400' />
            Recent Fees
          </h2>
        </div>
        <div className='p-2'>
          {historyLoading ? (
            <div className='space-y-1'>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className='h-6' />
              ))}
            </div>
          ) : feeHistory.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='w-full text-[11px]'>
                <thead>
                  <tr className='border-b border-gray-700'>
                    <th className='text-left py-1.5 px-2 text-gray-400 font-medium'>Date</th>
                    <th className='text-left py-1.5 px-2 text-gray-400 font-medium'>Type</th>
                    <th className='text-right py-1.5 px-2 text-gray-400 font-medium'>Fee</th>
                    <th className='text-left py-1.5 px-2 text-gray-400 font-medium'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {feeHistory.slice(0, 5).map((fee: any) => (
                    <tr key={fee.id} className='border-b border-gray-800/50 hover:bg-gray-800/30'>
                      <td className='py-1.5 px-2 text-gray-400'>
                        {new Date(fee.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className='py-1.5 px-2'>
                        <span
                          className={`px-1 py-0.5 rounded text-[10px] border ${getFeeTypeBadge(fee.fee_type)}`}
                        >
                          {getFeeTypeLabel(fee.fee_type)}
                        </span>
                      </td>
                      <td className='py-1.5 px-2 text-green-400 font-medium text-right'>
                        {formatUSD(fee.fee_amount_brl || fee.fee_amount)}
                      </td>
                      <td className='py-1.5 px-2'>
                        <span
                          className={`px-1 py-0.5 rounded text-[10px] border ${getStatusBadge(fee.status)}`}
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
            <p className='text-gray-400 text-center py-3 text-xs'>
              No fee transactions recorded yet.
            </p>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className='flex justify-center items-center gap-2 mt-2 pt-2 border-t border-gray-700'>
              <button
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className='p-1 bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-700'
                title='Página anterior'
              >
                <ChevronLeft className='h-3 w-3 text-gray-400' />
              </button>
              <span className='text-gray-400 text-[10px]'>
                {historyPage}/{pagination.pages}
              </span>
              <button
                onClick={() => setHistoryPage(p => Math.min(pagination.pages, p + 1))}
                disabled={historyPage === pagination.pages}
                className='p-1 bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-700'
                title='Próxima página'
              >
                <ChevronRight className='h-3 w-3 text-gray-400' />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OTC Trade Commissions - Mais compacto */}
      <div className='bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700/30 rounded-lg'>
        <div className='p-2 border-b border-purple-700/30'>
          <h2 className='text-xs font-semibold text-white flex items-center gap-1.5'>
            <Calculator className='h-3.5 w-3.5 text-purple-400' />
            Comissões OTC (Instant Trades)
          </h2>
        </div>

        {/* Summary Cards - Grid compacto */}
        <div className='p-2 grid grid-cols-4 gap-2'>
          <div className='bg-purple-900/20 border border-purple-700/20 rounded p-2'>
            <p className='text-[10px] text-gray-400'>Spread</p>
            {accountingSummaryLoading ? (
              <Skeleton className='h-4 w-16 mt-0.5' />
            ) : (
              <p className='text-base font-bold text-purple-400'>
                {formatUSD(accountingTotals.spread)}
              </p>
            )}
          </div>
          <div className='bg-blue-900/20 border border-blue-700/20 rounded p-2'>
            <p className='text-[10px] text-gray-400'>Taxa de Rede</p>
            {accountingSummaryLoading ? (
              <Skeleton className='h-4 w-16 mt-0.5' />
            ) : (
              <p className='text-base font-bold text-blue-400'>
                {formatUSD(accountingTotals.network_fee)}
              </p>
            )}
          </div>
          <div className='bg-green-900/20 border border-green-700/20 rounded p-2'>
            <p className='text-[10px] text-gray-400'>Total Comissões</p>
            {accountingSummaryLoading ? (
              <Skeleton className='h-4 w-16 mt-0.5' />
            ) : (
              <p className='text-base font-bold text-green-400'>
                {formatUSD(accountingTotals.grand_total)}
              </p>
            )}
          </div>
          <div className='bg-gray-800/30 border border-gray-700/30 rounded p-2'>
            <p className='text-[10px] text-gray-400'>Trades</p>
            {accountingSummaryLoading ? (
              <Skeleton className='h-4 w-12 mt-0.5' />
            ) : (
              <p className='text-base font-bold text-white'>
                {accountingSummary.totals?.unique_trades || 0}
              </p>
            )}
          </div>
        </div>

        {/* Entries Table - Compacto */}
        <div className='p-2'>
          {accountingLoading ? (
            <div className='space-y-1'>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className='h-6 w-full' />
              ))}
            </div>
          ) : accountingEntries.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='w-full text-[11px]'>
                <thead>
                  <tr className='border-b border-gray-700/50'>
                    <th className='text-left py-1 px-2 text-gray-500 font-medium'>Data</th>
                    <th className='text-left py-1 px-2 text-gray-500 font-medium'>Tipo</th>
                    <th className='text-left py-1 px-2 text-gray-500 font-medium'>Ref</th>
                    <th className='text-left py-1 px-2 text-gray-500 font-medium'>Usuário</th>
                    <th className='text-left py-1 px-2 text-gray-500 font-medium'>%</th>
                    <th className='text-left py-1 px-2 text-gray-500 font-medium'>Valor</th>
                    <th className='text-left py-1 px-2 text-gray-500 font-medium'>Status</th>
                    <th className='text-left py-1 px-2 text-gray-500 font-medium'>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {accountingEntries.map((entry: any) => (
                    <tr key={entry.id} className='border-b border-gray-800/50 hover:bg-gray-800/30'>
                      <td className='py-1 px-2 text-gray-400'>
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className='py-1 px-2'>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] border ${getAccountingTypeBadge(entry.entry_type)}`}
                        >
                          {getAccountingTypeLabel(entry.entry_type)}
                        </span>
                      </td>
                      <td className='py-1 px-2 font-mono text-gray-400 text-[10px]'>
                        {entry.reference_code || '-'}
                      </td>
                      <td className='py-1 px-2 text-gray-400'>
                        {entry.user_name || entry.user_id?.substring(0, 8) || '-'}
                      </td>
                      <td className='py-1 px-2 text-gray-400'>{entry.percentage?.toFixed(1)}%</td>
                      <td className='py-1 px-2 text-green-400 font-medium'>
                        {formatUSD(entry.amount)}
                      </td>
                      <td className='py-1 px-2'>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] border ${getAccountingStatusBadge(entry.status)}`}
                        >
                          {entry.status === 'processed'
                            ? 'OK'
                            : entry.status === 'pending'
                              ? 'Pend.'
                              : entry.status}
                        </span>
                      </td>
                      <td className='py-1 px-2'>
                        {entry.trade_id && (
                          <a
                            href={`/admin/trades/${entry.trade_id}`}
                            className='text-blue-400 hover:text-blue-300'
                            title='Ver trade'
                          >
                            <ExternalLink className='h-3 w-3' />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='text-center py-4'>
              <Receipt className='h-6 w-6 text-gray-600 mx-auto mb-2' />
              <p className='text-gray-400 text-xs'>Nenhuma comissão registrada.</p>
            </div>
          )}

          {/* Pagination */}
          {accountingPagination.pages > 1 && (
            <div className='flex justify-center items-center gap-1 mt-2 pt-2 border-t border-gray-700/50'>
              <button
                onClick={() => setAccountingPage(p => Math.max(1, p - 1))}
                disabled={accountingPage === 1}
                className='p-1 bg-gray-800/50 rounded disabled:opacity-50 hover:bg-gray-700 transition-colors'
                title='Página anterior'
              >
                <ChevronLeft className='h-3 w-3 text-gray-400' />
              </button>
              <span className='px-2 text-gray-500 text-[10px]'>
                {accountingPage}/{accountingPagination.pages}
              </span>
              <button
                onClick={() => setAccountingPage(p => Math.min(accountingPagination.pages, p + 1))}
                disabled={accountingPage === accountingPagination.pages}
                className='p-1 bg-gray-800/50 rounded disabled:opacity-50 hover:bg-gray-700 transition-colors'
                title='Próxima página'
              >
                <ChevronRight className='h-3 w-3 text-gray-400' />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
