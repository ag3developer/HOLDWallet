/**
 * 🛡️ HOLD Wallet - Admin Trades Page
 * ===================================
 *
 * Página de gestão de trades OTC.
 * Usa React Query para cache de dados.
 */

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  XCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  AlertTriangle,
  DollarSign,
} from 'lucide-react'
import { useTradeStats, useTrades, useCancelTrade } from '@/hooks/admin/useAdminTrades'
import { type Trade } from '@/services/admin/adminService'
import { toast } from 'react-hot-toast'

export const AdminTradesPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const limit = 20

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1)
  }, [statusFilter, typeFilter])

  // Parâmetros para query
  const queryParams = useMemo(() => {
    const params: {
      skip: number
      limit: number
      status?: string
      operation_type?: string
      search?: string
    } = {
      skip: (page - 1) * limit,
      limit,
    }

    if (statusFilter !== 'all') {
      params.status = statusFilter
    }

    if (typeFilter !== 'all') {
      params.operation_type = typeFilter
    }

    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim()
    }

    return params
  }, [page, statusFilter, typeFilter, debouncedSearch])

  // Queries com cache
  const { data: stats } = useTradeStats()
  const { data: tradesData, isLoading: loading, refetch, isFetching } = useTrades(queryParams)

  // Mutation
  const cancelTradeMutation = useCancelTrade()

  const trades = tradesData?.items ?? []
  const total = tradesData?.total ?? 0

  const handleCancelTrade = async (trade: Trade) => {
    if (!confirm(`Deseja cancelar o trade ${trade.reference_code}?`)) {
      return
    }

    const reason = prompt('Motivo do cancelamento (opcional):')

    try {
      await cancelTradeMutation.mutateAsync({
        tradeId: trade.id,
        ...(reason ? { reason } : {}),
      })
      toast.success(`Trade ${trade.reference_code} cancelado com sucesso`)
    } catch (err: any) {
      console.error('Erro ao cancelar trade:', err)
      toast.error(err.response?.data?.detail || 'Erro ao cancelar trade')
    }
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

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'pending':
      case 'payment_processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'failed':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='w-3 h-3' />
      case 'pending':
      case 'payment_processing':
        return <Clock className='w-3 h-3' />
      case 'cancelled':
      case 'expired':
        return <XCircle className='w-3 h-3' />
      case 'failed':
        return <AlertTriangle className='w-3 h-3' />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído'
      case 'pending':
        return 'Pendente'
      case 'payment_processing':
        return 'Processando'
      case 'cancelled':
        return 'Cancelado'
      case 'expired':
        return 'Expirado'
      case 'failed':
        return 'Falhou'
      default:
        return status
    }
  }

  const canCancel = (status: string) => {
    return status === 'pending' || status === 'payment_processing'
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-6'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-2'>
          <TrendingUp className='w-8 h-8 text-green-600' />
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Gestão de Trades OTC</h1>
        </div>
        <p className='text-gray-600 dark:text-gray-400'>
          Monitore e gerencie todos os trades OTC da plataforma
        </p>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-5 gap-4 mb-6'>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center'>
              <TrendingUp className='w-5 h-5 text-blue-600' />
            </div>
            <div>
              <p className='text-sm text-gray-500'>Total de Trades</p>
              <p className='text-xl font-bold text-gray-900 dark:text-white'>
                {stats?.total_trades || 0}
              </p>
            </div>
          </div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center'>
              <CheckCircle className='w-5 h-5 text-green-600' />
            </div>
            <div>
              <p className='text-sm text-gray-500'>Concluídos</p>
              <p className='text-xl font-bold text-green-600'>{stats?.completed || 0}</p>
            </div>
          </div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center'>
              <Clock className='w-5 h-5 text-yellow-600' />
            </div>
            <div>
              <p className='text-sm text-gray-500'>Pendentes</p>
              <p className='text-xl font-bold text-yellow-600'>{stats?.pending || 0}</p>
            </div>
          </div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center'>
              <XCircle className='w-5 h-5 text-red-600' />
            </div>
            <div>
              <p className='text-sm text-gray-500'>Cancelados</p>
              <p className='text-xl font-bold text-red-600'>{stats?.cancelled || 0}</p>
            </div>
          </div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center'>
              <DollarSign className='w-5 h-5 text-purple-600' />
            </div>
            <div>
              <p className='text-sm text-gray-500'>Volume Total</p>
              <p className='text-xl font-bold text-purple-600'>
                {formatCurrency(stats?.total_volume_brl || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6'>
        <div className='flex flex-col md:flex-row gap-4'>
          {/* Search */}
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar por código, ID...'
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className='w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500'
            />
          </div>

          {/* Status Filter */}
          <div className='flex items-center gap-2'>
            <Filter className='w-4 h-4 text-gray-500' />
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className='px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
              title='Filtrar por status'
            >
              <option value='all'>Todos Status</option>
              <option value='pending'>Pendentes</option>
              <option value='payment_processing'>Processando</option>
              <option value='completed'>Concluídos</option>
              <option value='cancelled'>Cancelados</option>
              <option value='failed'>Falhas</option>
              <option value='expired'>Expirados</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className='flex gap-2'>
            <button
              onClick={() => {
                setTypeFilter('all')
                setPage(1)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => {
                setTypeFilter('buy')
                setPage(1)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === 'buy'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Compra
            </button>
            <button
              onClick={() => {
                setTypeFilter('sell')
                setPage(1)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === 'sell'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Venda
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className='p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50'
            title='Atualizar lista'
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isFetching ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Trades Table */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden'>
        {loading ? (
          <div className='p-8 text-center'>
            <RefreshCw className='w-8 h-8 animate-spin text-blue-500 mx-auto mb-4' />
            <p className='text-gray-600 dark:text-gray-400'>Carregando trades...</p>
          </div>
        ) : trades.length === 0 ? (
          <div className='p-8 text-center'>
            <TrendingUp className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <p className='text-gray-600 dark:text-gray-400'>Nenhum trade encontrado</p>
            {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                  setTypeFilter('all')
                  setPage(1)
                }}
                className='mt-4 text-blue-600 hover:underline'
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-700'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Código / Data
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Usuário
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Tipo
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Quantidade
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Preço
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Total USD
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Valor BRL
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                  {trades.map(trade => (
                    <tr key={trade.id} className='hover:bg-gray-50 dark:hover:bg-gray-700/50'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div>
                          <span className='text-sm font-medium text-gray-900 dark:text-white'>
                            {trade.reference_code}
                          </span>
                          <p className='text-xs text-gray-500'>{formatDate(trade.created_at)}</p>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {trade.username}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center gap-2'>
                          {trade.operation_type === 'buy' ? (
                            <>
                              <ArrowDownRight className='w-4 h-4 text-green-500' />
                              <span className='text-sm font-medium text-green-600'>Compra</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className='w-4 h-4 text-red-500' />
                              <span className='text-sm font-medium text-red-600'>Venda</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {trade.crypto_amount?.toLocaleString('pt-BR', {
                            maximumFractionDigits: 8,
                          })}{' '}
                          {trade.symbol}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {formatCurrency(trade.crypto_price || 0)}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm font-medium text-gray-900 dark:text-white'>
                          {formatCurrency(trade.total_amount || 0)}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        {trade.brl_total_amount ? (
                          <div>
                            <span className='text-sm font-medium text-green-600 dark:text-green-400'>
                              R${' '}
                              {trade.brl_total_amount.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            <p className='text-[10px] text-gray-400 uppercase'>
                              {trade.payment_method}
                            </p>
                          </div>
                        ) : (
                          <span className='text-sm text-gray-400'>-</span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}
                        >
                          {getStatusIcon(trade.status)}
                          {getStatusLabel(trade.status)}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          <button
                            onClick={() => navigate(`/admin/trades/${trade.id}`)}
                            className='p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg'
                            title='Ver detalhes'
                          >
                            <Eye className='w-4 h-4' />
                          </button>
                          {canCancel(trade.status) && (
                            <button
                              onClick={() => handleCancelTrade(trade)}
                              disabled={cancelTradeMutation.isPending}
                              className='p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-50'
                              title='Cancelar trade'
                            >
                              {cancelTradeMutation.isPending ? (
                                <RefreshCw className='w-4 h-4 animate-spin' />
                              ) : (
                                <XCircle className='w-4 h-4' />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className='px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between'>
              <span className='text-sm text-gray-500 dark:text-gray-400'>
                Mostrando {trades.length} de {total} trades
              </span>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50'
                  title='Página anterior'
                >
                  <ChevronLeft className='w-4 h-4' />
                </button>
                <span className='px-3 py-1 text-sm text-gray-700 dark:text-gray-300'>
                  Página {page} de {Math.ceil(total / limit) || 1}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / limit)}
                  className='p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50'
                  title='Próxima página'
                >
                  <ChevronRight className='w-4 h-4' />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
