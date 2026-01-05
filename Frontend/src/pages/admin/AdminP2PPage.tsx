/**
 * 🛡️ HOLD Wallet - Admin P2P Page
 * ================================
 *
 * Página de gestão de ordens P2P e disputas.
 * Usa React Query para cache de dados.
 */

import React, { useState, useMemo } from 'react'
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  MessageSquare,
  Shield,
  Scale,
  Pause,
  Play,
} from 'lucide-react'
import {
  useP2PStats,
  useP2POrders,
  useP2PDisputes,
  usePauseP2POrder,
  useActivateP2POrder,
} from '@/hooks/admin/useAdminP2P'

type TabType = 'orders' | 'disputes'

export const AdminP2PPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('orders')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orderTypeFilter, setOrderTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const limit = 20

  // Debounce search para evitar muitas requisições
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset page on search
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1)
  }, [statusFilter, orderTypeFilter, activeTab])

  // Parâmetros para queries
  const orderParams = useMemo(
    () => ({
      skip: (page - 1) * limit,
      limit,
      status_filter: statusFilter !== 'all' ? statusFilter : undefined,
      order_type: orderTypeFilter !== 'all' ? orderTypeFilter : undefined,
      search: debouncedSearch || undefined,
    }),
    [page, statusFilter, orderTypeFilter, debouncedSearch]
  )

  const disputeParams = useMemo(
    () => ({
      skip: (page - 1) * limit,
      limit,
      status_filter: statusFilter !== 'all' ? statusFilter : undefined,
      search: debouncedSearch || undefined,
    }),
    [page, statusFilter, debouncedSearch]
  )

  // Queries com cache
  const { data: stats, isLoading: statsLoading } = useP2PStats()
  const {
    data: ordersData,
    isLoading: ordersLoading,
    refetch: refetchOrders,
    isFetching: ordersFetching,
  } = useP2POrders(orderParams)
  const {
    data: disputesData,
    isLoading: disputesLoading,
    refetch: refetchDisputes,
    isFetching: disputesFetching,
  } = useP2PDisputes(disputeParams)

  // Mutations
  const pauseOrderMutation = usePauseP2POrder()
  const activateOrderMutation = useActivateP2POrder()

  const orders = ordersData?.items ?? []
  const disputes = disputesData?.items ?? []
  const total = activeTab === 'orders' ? (ordersData?.total ?? 0) : (disputesData?.total ?? 0)
  const loading =
    activeTab === 'orders' ? ordersLoading || ordersFetching : disputesLoading || disputesFetching

  const handlePauseOrder = async (orderId: string) => {
    if (!confirm('Deseja pausar esta ordem?')) return
    try {
      await pauseOrderMutation.mutateAsync(orderId)
    } catch (error) {
      console.error('Erro ao pausar ordem:', error)
      alert('Erro ao pausar ordem')
    }
  }

  const handleActivateOrder = async (orderId: string) => {
    if (!confirm('Deseja ativar esta ordem?')) return
    try {
      await activateOrderMutation.mutateAsync(orderId)
    } catch (error) {
      console.error('Erro ao ativar ordem:', error)
      alert('Erro ao ativar ordem')
    }
  }

  const handleRefresh = () => {
    if (activeTab === 'orders') {
      refetchOrders()
    } else {
      refetchDisputes()
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'open':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'completed':
      case 'closed':
      case 'resolved':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'investigating':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo'
      case 'open':
        return 'Aberto'
      case 'paused':
        return 'Pausado'
      case 'completed':
        return 'Concluído'
      case 'closed':
        return 'Fechado'
      case 'cancelled':
        return 'Cancelado'
      case 'investigating':
        return 'Em Análise'
      case 'resolved':
        return 'Resolvido'
      default:
        return status
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-6'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-2'>
          <Users className='w-8 h-8 text-purple-600' />
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Gestão P2P</h1>
        </div>
        <p className='text-gray-600 dark:text-gray-400'>Monitore ordens P2P e gerencie disputas</p>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center'>
              <Users className='w-5 h-5 text-green-600' />
            </div>
            <div>
              <p className='text-sm text-gray-500'>Ordens Ativas</p>
              <p className='text-xl font-bold text-gray-900 dark:text-white'>
                {stats?.active_orders ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center'>
              <AlertTriangle className='w-5 h-5 text-red-600' />
            </div>
            <div>
              <p className='text-sm text-gray-500'>Disputas Abertas</p>
              <p className='text-xl font-bold text-red-600'>{stats?.open_disputes ?? 0}</p>
            </div>
          </div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center'>
              <Clock className='w-5 h-5 text-yellow-600' />
            </div>
            <div>
              <p className='text-sm text-gray-500'>Ordens Pausadas</p>
              <p className='text-xl font-bold text-yellow-600'>{stats?.paused_orders ?? 0}</p>
            </div>
          </div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center'>
              <Shield className='w-5 h-5 text-blue-600' />
            </div>
            <div>
              <p className='text-sm text-gray-500'>Total Ordens</p>
              <p className='text-xl font-bold text-blue-600'>{stats?.total_orders ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='flex gap-4 mb-6'>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'orders'
              ? 'bg-purple-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <div className='flex items-center gap-2'>
            <Users className='w-4 h-4' />
            Ordens P2P
          </div>
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'disputes'
              ? 'bg-red-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <div className='flex items-center gap-2'>
            <Scale className='w-4 h-4' />
            Disputas
            {(stats?.open_disputes ?? 0) > 0 && (
              <span className='px-2 py-0.5 bg-white/20 rounded-full text-xs'>
                {stats?.open_disputes}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Search and Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6'>
        <div className='flex flex-wrap gap-4'>
          <div className='flex-1 min-w-[200px] relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              placeholder={
                activeTab === 'orders' ? 'Buscar por ID, usuário...' : 'Buscar disputa...'
              }
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500'
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            title='Filtrar por status'
            className='px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500'
          >
            <option value='all'>Todos os Status</option>
            {activeTab === 'orders' ? (
              <>
                <option value='active'>Ativo</option>
                <option value='paused'>Pausado</option>
                <option value='completed'>Concluído</option>
                <option value='cancelled'>Cancelado</option>
              </>
            ) : (
              <>
                <option value='open'>Aberto</option>
                <option value='investigating'>Em Análise</option>
                <option value='resolved'>Resolvido</option>
              </>
            )}
          </select>
          {activeTab === 'orders' && (
            <select
              value={orderTypeFilter}
              onChange={e => setOrderTypeFilter(e.target.value)}
              title='Filtrar por tipo'
              className='px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500'
            >
              <option value='all'>Todos os Tipos</option>
              <option value='buy'>Compra</option>
              <option value='sell'>Venda</option>
            </select>
          )}
          <button
            onClick={handleRefresh}
            className='p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600'
            title='Atualizar lista'
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden'>
        {loading ? (
          <div className='p-8 text-center'>
            <RefreshCw className='w-8 h-8 animate-spin text-blue-500 mx-auto mb-4' />
            <p className='text-gray-600 dark:text-gray-400'>Carregando...</p>
          </div>
        ) : activeTab === 'orders' ? (
          /* Orders Table */
          <>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-700'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      ID / Data
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Maker
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
                      Matches
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
                  {orders.map(order => (
                    <tr key={order.id} className='hover:bg-gray-50 dark:hover:bg-gray-700/50'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div>
                          <span className='text-sm font-medium text-gray-900 dark:text-white'>
                            #{order.id.slice(0, 8)}
                          </span>
                          <p className='text-xs text-gray-500'>{formatDate(order.created_at)}</p>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {order.username}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`text-sm font-medium ${order.order_type === 'buy' ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {order.order_type === 'buy' ? 'Compra' : 'Venda'}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {order.total_amount?.toLocaleString() ?? 0} {order.cryptocurrency}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          R$ {order.price?.toFixed(2) ?? '0.00'}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {order.completed_trades ?? 0}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          <button
                            className='p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg'
                            title='Ver detalhes'
                          >
                            <Eye className='w-4 h-4' />
                          </button>
                          {order.status === 'active' && (
                            <button
                              onClick={() => handlePauseOrder(order.id)}
                              className='p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg'
                              title='Pausar ordem'
                            >
                              <Pause className='w-4 h-4' />
                            </button>
                          )}
                          {order.status === 'paused' && (
                            <button
                              onClick={() => handleActivateOrder(order.id)}
                              className='p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg'
                              title='Ativar ordem'
                            >
                              <Play className='w-4 h-4' />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Disputes Table */
          <>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-700'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      ID / Ordem
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Reclamante
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Reclamado
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Motivo
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Data
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                  {disputes.map(dispute => (
                    <tr
                      key={dispute.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${dispute.status === 'open' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                    >
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div>
                          <span className='text-sm font-medium text-gray-900 dark:text-white'>
                            #{dispute.id.slice(0, 8)}
                          </span>
                          <p className='text-xs text-gray-500'>
                            Match: {dispute.match_id.slice(0, 8)}
                          </p>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {dispute.reporter_username}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-500'>-</span>
                      </td>
                      <td className='px-6 py-4 max-w-xs'>
                        <span className='text-sm text-gray-900 dark:text-white truncate block'>
                          {dispute.reason}
                        </span>
                        {dispute.description && (
                          <p className='text-xs text-gray-500 truncate'>{dispute.description}</p>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}
                        >
                          {dispute.status === 'open' && <AlertTriangle className='w-3 h-3' />}
                          {dispute.status === 'investigating' && <Clock className='w-3 h-3' />}
                          {dispute.status === 'resolved' && <CheckCircle className='w-3 h-3' />}
                          {getStatusLabel(dispute.status)}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                        {formatDate(dispute.created_at)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          <button
                            className='p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg'
                            title='Ver detalhes'
                          >
                            <Eye className='w-4 h-4' />
                          </button>
                          <button
                            className='p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg'
                            title='Abrir chat'
                          >
                            <MessageSquare className='w-4 h-4' />
                          </button>
                          {dispute.status !== 'resolved' && (
                            <button
                              className='p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg'
                              title='Resolver'
                            >
                              <CheckCircle className='w-4 h-4' />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        <div className='px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between'>
          <span className='text-sm text-gray-500 dark:text-gray-400'>
            Mostrando {activeTab === 'orders' ? orders.length : disputes.length} de {total}{' '}
            registros
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
              Página {page}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(activeTab === 'orders' ? orders.length : disputes.length) < limit}
              className='p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50'
              title='Próxima página'
            >
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
