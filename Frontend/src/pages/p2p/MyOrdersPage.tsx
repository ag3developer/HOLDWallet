import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Edit,
  Pause,
  Play,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  MoreVertical,
  AlertCircle,
  RefreshCw,
  Loader2,
  DollarSign,
} from 'lucide-react'
import { useMyP2POrders, useCancelP2POrder, useToggleOrderStatus } from '@/hooks/useP2POrders'
import { toast } from 'react-hot-toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export const MyOrdersPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'active' | 'paused' | 'completed' | 'cancelled'>(
    'active'
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCoin, setSelectedCoin] = useState<string>('all')
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    orderId: string | null
  }>({
    isOpen: false,
    orderId: null,
  })

  // Fetch user's orders
  const { data: ordersData, isLoading, error, refetch } = useMyP2POrders()
  const cancelOrderMutation = useCancelP2POrder()
  const toggleStatusMutation = useToggleOrderStatus()

  const cryptoOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'BTC', label: 'Bitcoin' },
    { value: 'ETH', label: 'Ethereum' },
    { value: 'USDT', label: 'Tether' },
    { value: 'BNB', label: 'BNB' },
    { value: 'SOL', label: 'Solana' },
  ]

  const handleCancelOrder = async (orderId: string) => {
    setModalState({ isOpen: true, orderId })
  }

  const confirmCancelOrder = async () => {
    if (!modalState.orderId) return

    try {
      await cancelOrderMutation.mutateAsync(modalState.orderId)
      toast.success('Ordem cancelada com sucesso')
    } catch (error) {
      console.error('Error canceling order:', error)
    }
  }

  const handleToggleStatus = async (orderId: string, currentStatus: boolean) => {
    try {
      await toggleStatusMutation.mutateAsync({ orderId, isActive: !currentStatus })
      toast.success(currentStatus ? 'Ordem pausada' : 'Ordem ativada')
    } catch (error) {
      console.error('Error toggling order status:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: {
        icon: CheckCircle,
        text: 'Ativa',
        color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      },
      paused: {
        icon: Pause,
        text: 'Pausada',
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      },
      completed: {
        icon: CheckCircle,
        text: 'Completa',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      },
      cancelled: {
        icon: XCircle,
        text: 'Cancelada',
        color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      },
    }
    const badge = badges[status as keyof typeof badges] || badges.active
    const Icon = badge.icon
    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}
      >
        <Icon className='w-4 h-4' />
        {badge.text}
      </span>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Filter orders based on active tab and search
  const filteredOrders =
    ordersData?.data?.filter((order: any) => {
      const matchesTab = order.status === activeTab
      const matchesCoin = selectedCoin === 'all' || order.coin === selectedCoin
      const matchesSearch =
        !searchTerm ||
        order.coin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.payment_methods?.some((pm: string) =>
          pm.toLowerCase().includes(searchTerm.toLowerCase())
        )

      return matchesTab && matchesCoin && matchesSearch
    }) || []

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => navigate('/p2p')}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
          >
            <ArrowLeft className='w-5 h-5' />
          </button>
          <div>
            <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Minhas Ordens P2P</h1>
            <p className='text-gray-600 dark:text-gray-400 mt-1'>
              Gerencie suas ordens de compra e venda
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/p2p/create-order')}
          className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2'
        >
          <Plus className='w-4 h-4' />
          Nova Ordem
        </button>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>Ordens Ativas</p>
              <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                {ordersData?.data?.filter((o: any) => o.status === 'active').length || 0}
              </p>
            </div>
            <div className='w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center'>
              <CheckCircle className='w-6 h-6 text-green-600' />
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>Pausadas</p>
              <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                {ordersData?.data?.filter((o: any) => o.status === 'paused').length || 0}
              </p>
            </div>
            <div className='w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center'>
              <Pause className='w-6 h-6 text-yellow-600' />
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>Completas</p>
              <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                {ordersData?.data?.filter((o: any) => o.status === 'completed').length || 0}
              </p>
            </div>
            <div className='w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center'>
              <CheckCircle className='w-6 h-6 text-blue-600' />
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>Volume Total</p>
              <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                {formatCurrency(
                  ordersData?.data?.reduce((acc: number, o: any) => acc + o.price * o.amount, 0) ||
                    0
                )}
              </p>
            </div>
            <div className='w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center'>
              <DollarSign className='w-6 h-6 text-purple-600' />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
        <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
          {/* Tabs */}
          <div className='flex flex-wrap gap-2 mb-4'>
            {[
              { key: 'active', label: 'Ativas', icon: CheckCircle },
              { key: 'paused', label: 'Pausadas', icon: Pause },
              { key: 'completed', label: 'Completas', icon: CheckCircle },
              { key: 'cancelled', label: 'Canceladas', icon: XCircle },
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Icon className='w-4 h-4' />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Search and Filters */}
          <div className='flex flex-col md:flex-row gap-3'>
            <div className='relative flex-1'>
              <Search className='w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar por criptomoeda ou método de pagamento...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>

            <select
              value={selectedCoin}
              onChange={e => setSelectedCoin(e.target.value)}
              aria-label='Filtrar por criptomoeda'
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            >
              {cryptoOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className='px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className='p-6'>
          {isLoading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
              <span className='ml-3 text-gray-600 dark:text-gray-400'>Carregando ordens...</span>
            </div>
          ) : error ? (
            <div className='flex flex-col items-center justify-center py-12'>
              <AlertCircle className='w-12 h-12 text-red-500 mb-3' />
              <p className='text-red-600 dark:text-red-400 font-medium'>Erro ao carregar ordens</p>
              <p className='text-gray-600 dark:text-gray-400 text-sm mt-2'>
                {error instanceof Error ? error.message : 'Erro desconhecido'}
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12'>
              <div className='w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4'>
                <Eye className='w-8 h-8 text-gray-400' />
              </div>
              <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
                Nenhuma ordem encontrada
              </h3>
              <p className='text-gray-600 dark:text-gray-400 mb-4'>
                Você ainda não criou nenhuma ordem P2P
              </p>
              <button
                onClick={() => navigate('/p2p/create-order')}
                className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2'
              >
                <Plus className='w-4 h-4' />
                Criar Primeira Ordem
              </button>
            </div>
          ) : (
            <div className='space-y-4'>
              {filteredOrders.map((order: any) => (
                <div
                  key={order.id}
                  className='border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors'
                >
                  <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
                    {/* Order Info */}
                    <div className='flex-1'>
                      <div className='flex items-center gap-3 mb-3'>
                        <div
                          className={`p-2 rounded-lg ${
                            order.type === 'sell'
                              ? 'bg-green-100 dark:bg-green-900'
                              : 'bg-red-100 dark:bg-red-900'
                          }`}
                        >
                          {order.type === 'sell' ? (
                            <TrendingUp className='w-5 h-5 text-green-600' />
                          ) : (
                            <TrendingDown className='w-5 h-5 text-red-600' />
                          )}
                        </div>
                        <div>
                          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                            {order.type === 'sell' ? 'Vender' : 'Comprar'} {order.coin}
                          </h3>
                          <p className='text-sm text-gray-600 dark:text-gray-400'>
                            Criada em {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                        <div>
                          <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>Preço</p>
                          <p className='font-semibold text-gray-900 dark:text-white'>
                            {formatCurrency(Number(order.price) || 0)}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>
                            Quantidade
                          </p>
                          <p className='font-semibold text-gray-900 dark:text-white'>
                            {Number(order.total_amount || order.amount) || 0}{' '}
                            {order.cryptocurrency || order.coin}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>Limites</p>
                          <p className='font-semibold text-gray-900 dark:text-white text-sm'>
                            {formatCurrency(Number(order.min_order_limit || order.minAmount) || 0)}{' '}
                            -{' '}
                            {formatCurrency(Number(order.max_order_limit || order.maxAmount) || 0)}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>Trades</p>
                          <p className='font-semibold text-gray-900 dark:text-white'>
                            {order.completed_trades || order.completedTrades || 0} completos
                          </p>
                        </div>
                      </div>

                      <div className='flex flex-wrap gap-2 mt-3'>
                        {order.payment_methods?.map((method: string, index: number) => (
                          <span
                            key={index}
                            className='px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium'
                          >
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className='flex flex-col items-end gap-3'>
                      {getStatusBadge(order.status)}

                      <div className='flex gap-2'>
                        <button
                          onClick={() => navigate(`/p2p/order/${order.id}`)}
                          className='p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors'
                          title='Ver Detalhes'
                        >
                          <Eye className='w-5 h-5' />
                        </button>

                        {order.status === 'active' && (
                          <>
                            <button
                              onClick={() => navigate(`/p2p/edit-order/${order.id}`)}
                              className='p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                              title='Editar'
                            >
                              <Edit className='w-5 h-5' />
                            </button>

                            <button
                              onClick={() =>
                                handleToggleStatus(order.id, order.status === 'active')
                              }
                              disabled={toggleStatusMutation.isPending}
                              className='p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors disabled:opacity-50'
                              title='Pausar'
                            >
                              <Pause className='w-5 h-5' />
                            </button>
                          </>
                        )}

                        {order.status === 'paused' && (
                          <button
                            onClick={() => handleToggleStatus(order.id, false)}
                            disabled={toggleStatusMutation.isPending}
                            className='p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50'
                            title='Reativar'
                          >
                            <Play className='w-5 h-5' />
                          </button>
                        )}

                        {(order.status === 'active' || order.status === 'paused') && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={cancelOrderMutation.isPending}
                            className='p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50'
                            title='Cancelar Ordem'
                          >
                            <Trash2 className='w-5 h-5' />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, orderId: null })}
        onConfirm={confirmCancelOrder}
        title='Cancelar Ordem'
        message='Tem certeza que deseja cancelar esta ordem? Esta ação não pode ser desfeita.'
        confirmText='Sim, cancelar'
        cancelText='Não, manter'
        type='danger'
        icon={<Trash2 className='w-6 h-6' />}
        isLoading={cancelOrderMutation.isPending}
      />
    </div>
  )
}
